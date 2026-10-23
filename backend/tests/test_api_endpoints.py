import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "SankatSetu" in data["service"]

@pytest.mark.asyncio
async def test_integrations_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/integrations/status")
        assert res.status_code == 200
        data = res.json()
        assert "mode" in data
        assert data["database_connected"] is True
        assert data["osm_geocoding_ready"] is True

@pytest.mark.asyncio
async def test_analyze_and_clarify_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Submit incomplete report
        res = await client.post(
            "/api/agent/analyze",
            data={"text": "Water main pipe broke and is submerging cars."}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "AWAITING_CLARIFICATION"
        task_id = data["task_id"]

        # 2. Clarify location
        clarify_res = await client.post(
            "/api/agent/clarify",
            json={"task_id": task_id, "clarifications": {"location": "FC Road, Pune"}}
        )
        assert clarify_res.status_code == 200
        clarify_data = clarify_res.json()
        assert clarify_data["status"] == "COMPLETED"
        assert len(clarify_data["reports"]) >= 1

@pytest.mark.asyncio
async def test_reports_crud_and_approval():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Run an analysis to generate reports
        res = await client.post(
            "/api/agent/analyze",
            data={
                "text": "Deep crater pothole near college gate, severe hazard.",
                "location": "MG Road, Pune"
            }
        )
        data = res.json()
        assert len(data["reports"]) >= 1
        rep_id = data["reports"][0]["id"]

        # Get single report
        get_res = await client.get(f"/api/reports/{rep_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == rep_id

        # Approve consequential action
        appr_res = await client.post(
            f"/api/reports/{rep_id}/approve",
            json={"decision": "APPROVED", "operator_name": "Senior Traffic Supervisor", "notes": "Dispatched emergency crew"}
        )
        assert appr_res.status_code == 200
        assert appr_res.json()["approval_status"] == "APPROVED"
        assert appr_res.json()["approved_by"] == "Senior Traffic Supervisor"
