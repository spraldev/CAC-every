# Makefile for Urban Issue Detection Dataset Pipeline
SHELL := /bin/bash
.PHONY: all setup env download merge train train-mps test val clean help

# Default target
all: setup download merge

# Help target
help:
	@echo "Urban Issue Detection Dataset Pipeline"
	@echo "======================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make setup     - Create venv and install dependencies"
	@echo "  make env       - Export environment variables for HF downloads"
	@echo "  make download  - Download all datasets from Hugging Face"
	@echo "  make merge     - Merge datasets into unified COCO format"
	@echo "  make train     - Train YOLOv8n model (CPU - stable)"
	@echo "  make train-mps - Train YOLOv8n model (Apple GPU - experimental)"
	@echo "  make test      - Test trained model on sample images"
	@echo "  make val       - Validate trained model"
	@echo "  make clean     - Clean generated files (preserve downloads)"
	@echo "  make all       - Run setup, download, and merge"

# Create virtual environment and install dependencies
setup:
	@echo "Setting up Python virtual environment..."
	python3 -m venv .venv
	@echo "Activating venv and installing dependencies..."
	. .venv/bin/activate && pip install -U pip
	. .venv/bin/activate && pip install -r requirements.txt
	@echo "✓ Setup complete. Activate with: source .venv/bin/activate"

# Set environment variables for HF downloads
env:
	@echo "Setting environment variables..."
	export HF_HUB_ENABLE_HF_TRANSFER=1
	export HF_HUB_DOWNLOAD_TIMEOUT=120
	@echo "✓ Environment configured"

# Download all datasets
download: env
	@echo "Downloading datasets from Hugging Face..."
	@if [ -d ".venv" ]; then \
		. .venv/bin/activate && python scripts/download_all.py; \
	else \
		python scripts/download_all.py; \
	fi

# Merge datasets into COCO format
merge:
	@echo "Merging datasets to COCO format..."
	@if [ -d ".venv" ]; then \
		. .venv/bin/activate && python scripts/merge_to_coco.py \
			--sources data/sources \
			--out data/merged \
			--schema config/label_schema.json \
			--rules config/dataset_map_rules.yaml \
			--val-ratio 0.2; \
	else \
		python scripts/merge_to_coco.py \
			--sources data/sources \
			--out data/merged \
			--schema config/label_schema.json \
			--rules config/dataset_map_rules.yaml \
			--val-ratio 0.2; \
	fi

# Train YOLOv8 model
train:
	@echo "Training YOLOv8n model..."
	@echo "Note: Using CPU for stability on Mac. Training will be slower but more reliable."
	@echo "For faster training, consider using a cloud GPU service."
	@if [ -d ".venv" ]; then \
		. .venv/bin/activate && yolo detect train \
			model=yolov8n.pt \
			data=seesomething.yaml \
			imgsz=640 \
			epochs=10 \
			batch=4 \
			name=ssai_y8n \
			patience=5 \
			save=True \
			device=cpu \
			workers=0; \
	else \
		yolo detect train \
			model=yolov8n.pt \
			data=seesomething.yaml \
			imgsz=640 \
			epochs=10 \
			batch=4 \
			name=ssai_y8n \
			patience=5 \
			save=True \
			device=cpu \
			workers=0; \
	fi

# Train on MPS (Apple GPU) - experimental
train-mps:
	@echo "Training YOLOv8n model on MPS (Apple GPU)..."
	@echo "Warning: MPS support is experimental and may crash."
	@if [ -d ".venv" ]; then \
		. .venv/bin/activate && PYTORCH_ENABLE_MPS_FALLBACK=1 yolo detect train \
			model=yolov8n.pt \
			data=seesomething.yaml \
			imgsz=640 \
			epochs=50 \
			batch=4 \
			name=ssai_y8n_mps \
			patience=10 \
			save=True \
			device=mps \
			workers=0 \
			amp=False; \
	else \
		PYTORCH_ENABLE_MPS_FALLBACK=1 yolo detect train \
			model=yolov8n.pt \
			data=seesomething.yaml \
			imgsz=640 \
			epochs=50 \
			batch=4 \
			name=ssai_y8n_mps \
			patience=10 \
			save=True \
			device=mps \
			workers=0 \
			amp=False; \
	fi

# Test trained model
test:
	@echo "Testing trained model on sample images..."
	@if [ -d ".venv" ]; then \
		. .venv/bin/activate && python test_model.py; \
	else \
		python test_model.py; \
	fi

# Validate model
val:
	@echo "Validating model..."
	@if [ -f "runs/detect/ssai_y8n/weights/best.pt" ]; then \
		if [ -d ".venv" ]; then \
			. .venv/bin/activate && yolo detect val \
				model=runs/detect/ssai_y8n/weights/best.pt \
				data=seesomething.yaml \
				imgsz=640 \
				batch=8 \
				device=mps; \
		else \
			yolo detect val \
				model=runs/detect/ssai_y8n/weights/best.pt \
				data=seesomething.yaml \
				imgsz=640 \
				batch=8 \
				device=mps; \
		fi \
	else \
		echo "Error: Model not found. Please run 'make train' first."; \
		exit 1; \
	fi

# Clean generated files (preserve downloads)
clean:
	@echo "Cleaning generated files..."
	rm -rf data/merged
	rm -rf runs
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Cleaned (downloads preserved in data/sources)"

# Full clean including downloads
clean-all: clean
	@echo "Removing all downloaded data..."
	rm -rf data/sources
	rm -rf data/.hf_cache
	rm -rf .venv
	@echo "✓ All data removed"
