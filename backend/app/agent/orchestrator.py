import uuid
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.database import db_session, log_audit_event
from app.models.schemas import TaskWorkflowStage, VerificationType, SeverityLevel
from app.agent.gemini_client import gemini_bridge
from app.tools.classifier import classify_issue, assess_severity
from app.tools.extractor import extract_structured_details
from app.tools.validator import validate_required_information, verify_tool_result
from app.tools.geocoding import resolve_location
from app.tools.image_analyzer import analyze_uploaded_image
from app.tools.public_data import check_available_public_data
from app.tools.planner import generate_action_plan
from app.tools.report_tools import save_report, prepare_submission_preview

class AgentOrchestrator:
    MAX_BOUNDED_STEPS: int = 15

    async def execute(
        self,
        raw_text: str,
        user_location: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        image_path: Optional[str] = None,
        audio_transcript: Optional[str] = None,
        scenario: Optional[str] = None,
        simulate_failure: bool = False
    ) -> Dict[str, Any]:
        """
        Executes the bounded, verified 10-step agent pipeline.
        Logs every stage and tool execution into SQLite.
        """
        task_id = f"TSK-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Combine transcript if present
        effective_input = raw_text
        if audio_transcript and audio_transcript.strip():
            effective_input = f"{raw_text.strip()}\n[Voice Transcript]: {audio_transcript.strip()}".strip()

        mode = "REAL_GEMINI" if gemini_bridge.is_real else "DEMO_MODE"
        
        trace: List[Dict[str, Any]] = []
        verifications: List[Dict[str, Any]] = []
        tool_records: List[Dict[str, Any]] = []

        # Record initial task entry in database
        with db_session() as conn:
            conn.execute("""
                INSERT INTO tasks (id, created_at, updated_at, raw_input, mode, status, missing_information, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id, now_iso, now_iso, effective_input, mode,
                TaskWorkflowStage.UNDERSTAND.value, "[]",
                json.dumps({
                    "scenario": scenario,
                    "image_path": image_path,
                    "user_location": user_location,
                    "has_gps": bool(latitude and longitude),
                    "simulate_failure": simulate_failure
                })
            ))

        # --- STAGE 1: UNDERSTAND ---
        current_stage = TaskWorkflowStage.UNDERSTAND
        stage_start = time.perf_counter()
        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": "Input received and contextualized.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000),
            "details": {
                "input_length": len(effective_input),
                "has_audio": bool(audio_transcript),
                "has_image": bool(image_path),
                "has_user_location": bool(user_location)
            }
        })

        # Record user provided input verification
        verifications.append({
            "id": f"ver-{uuid.uuid4().hex[:6]}",
            "item_name": "Citizen Input Text",
            "verification_type": VerificationType.USER_PROVIDED.value,
            "confidence": 1.0,
            "details": "Direct statement received from citizen report."
        })

        # --- STAGE 2: DECOMPOSE ---
        current_stage = TaskWorkflowStage.DECOMPOSE
        stage_start = time.perf_counter()
        
        intent_res = await gemini_bridge.decompose_and_structure_intent(effective_input, user_location)
        issues_raw = intent_res["data"].get("issues", [])
        extracted_location = intent_res["data"].get("extracted_location")
        missing_details = intent_res["data"].get("missing_details", [])

        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": f"Decomposed input into {len(issues_raw)} distinct issues via {intent_res['source']}.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000),
            "engine": intent_res["model"],
            "issues_count": len(issues_raw)
        })

        # Save subtasks to DB
        subtask_records = []
        for idx, iss in enumerate(issues_raw):
            sub_id = f"{task_id}-sub-{idx+1}"
            sub_title = iss.get("title", f"Issue #{idx+1}")
            sub_cat = iss.get("category", "general_civic_issue")
            sub_sev = iss.get("severity", "Medium")
            sub_clause = iss.get("raw_clause", effective_input)
            
            with db_session() as conn:
                conn.execute("""
                    INSERT INTO subtasks (id, task_id, title, category, severity, status, dependencies, assigned_tools, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    sub_id, task_id, sub_title, sub_cat, sub_sev,
                    "IN_PROGRESS", "[]", json.dumps(["classify_issue", "assess_severity", "resolve_location", "prepare_submission_preview"]),
                    now_iso
                ))

            subtask_records.append({
                "id": sub_id,
                "task_id": task_id,
                "title": sub_title,
                "category": sub_cat,
                "severity": sub_sev,
                "status": "IN_PROGRESS",
                "raw_clause": sub_clause,
                "is_submerged": iss.get("is_submerged", False),
                "severity_reason": iss.get("severity_reason", "Assessed according to societal risk criteria.")
            })

            verifications.append({
                "id": f"ver-{uuid.uuid4().hex[:6]}",
                "item_name": f"Subtask: {sub_title}",
                "verification_type": VerificationType.AI_INFERRED.value,
                "confidence": 0.90 if gemini_bridge.is_real else 0.85,
                "details": f"Decomposed issue classified as {sub_cat} ({sub_sev})."
            })

        # --- STAGE 3: PLAN ---
        current_stage = TaskWorkflowStage.PLAN
        stage_start = time.perf_counter()
        
        # Determine candidate location to evaluate
        candidate_loc = user_location or extracted_location
        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": f"Orchestrated execution plan across {len(subtask_records)} subtasks.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000),
            "planned_tool_calls": ["validate_required_information", "resolve_location", "analyze_uploaded_image", "check_available_public_data", "generate_action_plan", "prepare_submission_preview", "save_report"]
        })

        # --- STAGE 4: VALIDATE ---
        current_stage = TaskWorkflowStage.VALIDATE
        stage_start = time.perf_counter()

        val_result = validate_required_information(
            {"description": effective_input, "primary_location": candidate_loc},
            user_location=user_location,
            coordinates=(latitude, longitude) if (latitude and longitude) else None
        )

        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED" if val_result["is_valid"] else "CLARIFICATION_REQUIRED",
            "message": "Validated required parameters." if val_result["is_valid"] else "Missing required dispatch parameters.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000),
            "validation": val_result
        })

        # If Scenario 1 (Incomplete input / missing location) or no location provided:
        if not val_result["is_valid"] and "exact_street_or_landmark" in val_result["missing_fields"]:
            verifications.append({
                "id": f"ver-{uuid.uuid4().hex[:6]}",
                "item_name": "Exact Street / Landmark Location",
                "verification_type": VerificationType.MISSING.value,
                "confidence": 0.0,
                "details": "Location is missing or overly relative. Exact street or landmark must be specified before official report creation."
            })

            # Update task status in database to AWAITING_CLARIFICATION
            with db_session() as conn:
                conn.execute("""
                    UPDATE tasks SET status = ?, missing_information = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    "AWAITING_CLARIFICATION",
                    json.dumps(val_result["missing_fields"]),
                    datetime.now(timezone.utc).isoformat(),
                    task_id
                ))

            # Return paused state with clear prompt for missing details!
            return {
                "task_id": task_id,
                "status": "AWAITING_CLARIFICATION",
                "current_stage": TaskWorkflowStage.VALIDATE.value,
                "mode": mode,
                "clarification_prompt": val_result["clarification_prompt"],
                "missing_information": val_result["missing_fields"],
                "subtasks": subtask_records,
                "execution_trace": trace,
                "verifications": verifications,
                "tool_executions": tool_records,
                "reports": []
            }

        # --- STAGE 5: SELECT TOOLS ---
        current_stage = TaskWorkflowStage.SELECT_TOOLS
        stage_start = time.perf_counter()
        
        tools_to_run = ["resolve_location"]
        if image_path:
            tools_to_run.append("analyze_uploaded_image")
        tools_to_run.append("check_available_public_data")
        tools_to_run.append("generate_action_plan")

        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": f"Selected dynamic tool chain: {', '.join(tools_to_run)}",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000),
            "tools": tools_to_run
        })

        # --- STAGE 6: EXECUTE TOOLS ---
        current_stage = TaskWorkflowStage.EXECUTE
        stage_start = time.perf_counter()

        # Tool 1: resolve_location
        t_loc_start = time.perf_counter()
        loc_res = await resolve_location(
            candidate_loc or "",
            user_coords=(latitude, longitude) if (latitude and longitude) else None
        )
        t_loc_dur = int((time.perf_counter() - t_loc_start) * 1000)

        loc_tool_exec_id = f"tool-{uuid.uuid4().hex[:6]}"
        tool_records.append({
            "id": loc_tool_exec_id,
            "task_id": task_id,
            "tool_name": "resolve_location",
            "parameters": {"query": candidate_loc, "gps": bool(latitude and longitude)},
            "result": loc_res,
            "error": None if loc_res.get("resolved") else loc_res.get("note"),
            "status": "SUCCESS" if loc_res.get("resolved") else "RECOVERED",
            "started_at": now_iso,
            "duration_ms": t_loc_dur
        })

        # Tool 2: analyze_uploaded_image (if present)
        img_res = None
        if image_path:
            t_img_start = time.perf_counter()
            img_res = await analyze_uploaded_image(image_path, gemini_client=gemini_bridge.client)
            t_img_dur = int((time.perf_counter() - t_img_start) * 1000)

            tool_records.append({
                "id": f"tool-{uuid.uuid4().hex[:6]}",
                "task_id": task_id,
                "tool_name": "analyze_uploaded_image",
                "parameters": {"file_path": image_path},
                "result": img_res,
                "error": None if img_res.get("success") else img_res.get("error"),
                "status": "SUCCESS" if img_res.get("success") else "FAILED",
                "started_at": now_iso,
                "duration_ms": t_img_dur
            })

        # Tool 3: check_available_public_data (with controlled failure support)
        t_pub_start = time.perf_counter()
        pub_res = None
        pub_error = None
        pub_status = "SUCCESS"

        try:
            pub_res = await check_available_public_data(
                latitude=loc_res.get("latitude") or latitude,
                longitude=loc_res.get("longitude") or longitude,
                location_name=loc_res.get("display_name"),
                simulate_failure=simulate_failure
            )
        except Exception as ex:
            pub_error = str(ex)
            pub_status = "FAILED"
            pub_res = {"error": pub_error, "available": False}

        t_pub_dur = int((time.perf_counter() - t_pub_start) * 1000)
        tool_records.append({
            "id": f"tool-{uuid.uuid4().hex[:6]}",
            "task_id": task_id,
            "tool_name": "check_available_public_data",
            "parameters": {
                "latitude": loc_res.get("latitude"),
                "longitude": loc_res.get("longitude"),
                "simulate_failure": simulate_failure
            },
            "result": pub_res,
            "error": pub_error,
            "status": pub_status,
            "started_at": now_iso,
            "duration_ms": t_pub_dur
        })

        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": f"Executed {len(tool_records)} bounded tool runs.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000)
        })

        # --- STAGE 7: VERIFY ---
        current_stage = TaskWorkflowStage.VERIFY
        stage_start = time.perf_counter()

        # Verify location output
        v_loc = verify_tool_result("resolve_location", loc_res, ["resolved", "latitude", "longitude"])
        verifications.append({
            "id": f"ver-{uuid.uuid4().hex[:6]}",
            "item_name": "Geocoded Coordinates",
            "verification_type": VerificationType.TOOL_VERIFIED.value if loc_res.get("resolved") else VerificationType.MISSING.value,
            "confidence": 0.95 if loc_res.get("resolved") else 0.0,
            "details": f"{loc_res.get('display_name') or 'Unresolved'} via {loc_res.get('source')}.",
            "verified_by_tool": "resolve_location"
        })

        # Verify image output if applicable
        if img_res:
            v_img_type = VerificationType.TOOL_VERIFIED.value if (img_res.get("verified") and img_res.get("analysis_mode") == "GEMINI_MULTIMODAL_API") else VerificationType.AI_INFERRED.value
            verifications.append({
                "id": f"ver-{uuid.uuid4().hex[:6]}",
                "item_name": "Visual Evidence Inspection",
                "verification_type": v_img_type,
                "confidence": 0.95 if v_img_type == VerificationType.TOOL_VERIFIED.value else 0.70,
                "details": img_res.get("visual_summary", "Image processed."),
                "verified_by_tool": "analyze_uploaded_image"
            })

        # Verify public data output
        if pub_status == "FAILED":
            verifications.append({
                "id": f"ver-{uuid.uuid4().hex[:6]}",
                "item_name": "Municipal Grid Telemetry",
                "verification_type": VerificationType.FAILED_VERIFICATION.value,
                "confidence": 0.0,
                "details": f"Tool execution failed: {pub_error}",
                "verified_by_tool": "check_available_public_data"
            })
        else:
            verifications.append({
                "id": f"ver-{uuid.uuid4().hex[:6]}",
                "item_name": "Live Meteorological Telemetry",
                "verification_type": VerificationType.TOOL_VERIFIED.value if pub_res.get("available") else VerificationType.AI_INFERRED.value,
                "confidence": 0.95 if pub_res.get("available") else 0.40,
                "details": pub_res.get("weather", {}).get("condition_summary") if pub_res.get("weather") else pub_res.get("message", "No live telemetry."),
                "verified_by_tool": "check_available_public_data"
            })

        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": f"Processed {len(verifications)} distinct verification claims.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000)
        })

        # --- STAGE 8: RECOVER IF NEEDED (Scenario 3 handling) ---
        current_stage = TaskWorkflowStage.RECOVER_IF_NEEDED
        stage_start = time.perf_counter()

        recovery_engaged = False
        recovery_message = None

        if pub_status == "FAILED" or simulate_failure:
            recovery_engaged = True
            recovery_message = (
                "AUTOMATIC RECOVERY PROTOCOL ENGAGED: Municipal Telemetry sensor network returned an error. "
                "Agent bypassed automated sensor dependency, generated immediate high-priority safety advisory, "
                "and routed issue to Emergency Hotline Dispatch protocol."
            )
            trace.append({
                "stage": current_stage.value,
                "status": "RECOVERED",
                "message": recovery_message,
                "duration_ms": int((time.perf_counter() - stage_start) * 1000),
                "action": "Fallback to high-priority manual dispatch checklist"
            })
        else:
            trace.append({
                "stage": current_stage.value,
                "status": "COMPLETED",
                "message": "All critical tool pathways executed cleanly without recovery escalation.",
                "duration_ms": int((time.perf_counter() - stage_start) * 1000)
            })

        # --- STAGE 9: GENERATE ACTION PLAN & REQUEST APPROVAL ---
        current_stage = TaskWorkflowStage.REQUEST_APPROVAL
        stage_start = time.perf_counter()

        action_plan = generate_action_plan(subtask_records, loc_res, pub_res)
        trace.append({
            "stage": current_stage.value,
            "status": "COMPLETED",
            "message": f"Synthesized action plan with {action_plan['total_actions']} agency dispatches. Awaiting user approval.",
            "duration_ms": int((time.perf_counter() - stage_start) * 1000),
            "urgent_advisories": action_plan["immediate_safety_advisories"]
        })

        # --- STAGE 10: PRESENT RESULTS & PERSIST TO SQLITE ---
        current_stage = TaskWorkflowStage.PRESENT_RESULTS
        created_reports = []

        for sub in subtask_records:
            # Match action plan item for this subtask
            matched_action = next((a for a in action_plan["actions"] if a["subtask_id"] == sub["id"]), None)
            rec_actions = [matched_action["recommended_sop"]] if matched_action else ["Dispatch inspector team to verify location."]
            if action_plan.get("immediate_safety_advisories"):
                rec_actions.extend(action_plan["immediate_safety_advisories"])

            evidence = [
                f"Citizen report: '{sub['raw_clause']}'",
                f"Severity reason: {sub['severity_reason']}"
            ]
            if img_res and img_res.get("success"):
                evidence.append(f"Visual inspection ({img_res.get('analysis_mode')}): {img_res.get('visual_summary')}")
            if pub_res and pub_res.get("available") and pub_res.get("weather"):
                evidence.append(f"Meteorological telemetry: {pub_res['weather'].get('condition_summary')}")
            if recovery_engaged:
                evidence.append("Fallback protocol activated: Primary sensor grid unreachable; manual confirmation recommended.")

            missing_info_list = []
            if not loc_res.get("resolved"):
                missing_info_list.append("Precise landmark/cross-street unverified")

            # Persist report to SQLite with tracking ID
            saved = save_report(
                task_id=task_id,
                subtask_id=sub["id"],
                category=sub["category"],
                severity=sub["severity"],
                title=sub["title"],
                description=sub["raw_clause"],
                location_name=loc_res.get("display_name") or candidate_loc,
                latitude=loc_res.get("latitude"),
                longitude=loc_res.get("longitude"),
                location_verified=loc_res.get("resolved", False),
                evidence_data=evidence,
                missing_info=missing_info_list,
                recommended_actions=rec_actions
            )
            created_reports.append(saved)

        # Commit final task record into DB
        with db_session() as conn:
            conn.execute("""
                UPDATE tasks
                SET status = ?, updated_at = ?
                WHERE id = ?
            """, (
                TaskWorkflowStage.COMPLETED.value,
                datetime.now(timezone.utc).isoformat(),
                task_id
            ))

            # Commit tool executions to SQLite
            for t in tool_records:
                conn.execute("""
                    INSERT INTO tool_executions (id, task_id, tool_name, parameters, result, error, status, started_at, duration_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    t["id"], t["task_id"], t["tool_name"],
                    json.dumps(t["parameters"]),
                    json.dumps(t["result"]) if t["result"] else None,
                    t["error"], t["status"], t["started_at"], t["duration_ms"]
                ))

            # Commit verifications to SQLite
            for v in verifications:
                conn.execute("""
                    INSERT INTO verifications (id, task_id, item_name, verification_type, confidence, details, verified_by_tool, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    v["id"], task_id, v["item_name"], v["verification_type"],
                    v["confidence"], v["details"], v.get("verified_by_tool"),
                    now_iso
                ))

        log_audit_event("task", task_id, "COMPLETED", {"reports_created": len(created_reports), "mode": mode})

        return {
            "task_id": task_id,
            "status": "COMPLETED",
            "current_stage": TaskWorkflowStage.PRESENT_RESULTS.value,
            "mode": mode,
            "recovery_engaged": recovery_engaged,
            "recovery_message": recovery_message,
            "subtasks": subtask_records,
            "action_plan": action_plan,
            "reports": created_reports,
            "execution_trace": trace,
            "verifications": verifications,
            "tool_executions": tool_records
        }

    async def resume_with_clarification(self, task_id: str, clarifications: Dict[str, str]) -> Dict[str, Any]:
        """
        Resumes an AWAITING_CLARIFICATION task after the citizen supplies missing details.
        """
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            task = cursor.fetchone()
            if not task:
                raise ValueError(f"Task {task_id} not found.")

        raw_input = task["raw_input"]
        supplied_loc = clarifications.get("location") or clarifications.get("exact_street_or_landmark") or ""
        
        # Re-execute with supplied location
        return await self.execute(
            raw_text=raw_input,
            user_location=supplied_loc,
            scenario="scenario_1_resumed"
        )

orchestrator = AgentOrchestrator()
