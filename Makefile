.PHONY: setup dev up down test seed-demo synthetic clean

setup:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

up:
	docker compose up --build -d

down:
	docker compose down

test:
	pytest backend/tests

synthetic:
	python scripts/make_synthetic.py

seed-demo:
	python scripts/seed_demo.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
