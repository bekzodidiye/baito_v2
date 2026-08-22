import asyncio
import time
import httpx
import statistics

BASE_URL = "http://127.0.0.1:8000"

async def simulate_worker_request(client: httpx.AsyncClient, worker_id: int):
    start = time.time()
    try:
        # 1. Fetch jobs feed
        res_jobs = await client.get(f"{BASE_URL}/api/v1/jobs?limit=20")
        # 2. Health check
        res_health = await client.get(f"{BASE_URL}/api/health")
        latency = (time.time() - start) * 1000 # in ms
        return {"success": res_jobs.status_code == 200 and res_health.status_code == 200, "latency": latency}
    except Exception as e:
        return {"success": False, "latency": (time.time() - start) * 1000, "error": str(e)}

async def run_stress_test(total_requests: int = 100, concurrency: int = 20):
    print(f"\n🚀 Running High-Concurrency Stress Test ({total_requests} requests, concurrency: {concurrency})...")
    limits = httpx.Limits(max_keepalive_connections=50, max_connections=concurrency)
    async with httpx.AsyncClient(limits=limits, timeout=10.0) as client:
        tasks = []
        for i in range(total_requests):
            tasks.append(simulate_worker_request(client, i))
        
        start_time = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time

    successful = [r for r in results if r["success"]]
    latencies = [r["latency"] for r in results if r["success"]]

    print("=" * 60)
    print("📊 STRESS TEST RESULTS:")
    print(f"Total Requests: {total_requests}")
    print(f"Successful:     {len(successful)} ({(len(successful)/total_requests)*100:.1f}%)")
    print(f"Failed:         {total_requests - len(successful)}")
    print(f"Total Duration: {total_time:.2f} seconds")
    print(f"Throughput:     {total_requests / total_time:.1f} Req/Sec")
    if latencies:
        print(f"Min Latency:    {min(latencies):.2f} ms")
        print(f"Avg Latency:    {statistics.mean(latencies):.2f} ms")
        print(f"P50 Latency:    {statistics.median(latencies):.2f} ms")
        print(f"P95 Latency:    {statistics.quantiles(latencies, n=20)[18]:.2f} ms")
        print(f"Max Latency:    {max(latencies):.2f} ms")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_stress_test(100, 20))
