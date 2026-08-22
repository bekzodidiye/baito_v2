from locust import HttpUser, task, between

class BaitoPlatformUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def view_jobs(self):
        self.client.get("/api/v1/jobs?limit=20")

    @task(1)
    def health_probe(self):
        self.client.get("/api/health")
