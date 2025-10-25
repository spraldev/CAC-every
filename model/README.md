# Urban Issue Detection Dataset Pipeline

A robust ML/MLOps pipeline for downloading, merging, and preparing urban issue detection datasets from Hugging Face for YOLO training.

## Features

- **Robust dataset downloading** from Hugging Face with resume capability
- **Automatic format detection** (COCO/YOLO) and conversion
- **Smart label remapping** to unified 10-class schema
- **Train/validation splitting** with stratification
- **YOLO training ready** with Ultralytics configuration

## Quick Start

```bash
# 1. Setup environment and install dependencies
make setup
source .venv/bin/activate

# 2. Download all datasets from Hugging Face
make download

# 3. Merge datasets into unified COCO format
make merge

# 4. Train YOLOv8 model
make train

# 5. Validate the trained model
make val
```

## Target Classes (10 categories)

| Index | Class Name | Description |
|-------|------------|-------------|
| 0 | pothole | Road surface holes and depressions |
| 1 | road_crack | Cracks, alligator patterns, surface damage |
| 2 | road_debris | Objects, rocks, branches on roads |
| 3 | overflowing_trash | Garbage, litter, waste dumps |
| 4 | damaged_sign | Broken, bent, or vandalized signage |
| 5 | graffiti | Spray paint, vandalism markings |
| 6 | bad_streetlight | Damaged or non-functional street lighting |
| 7 | sidewalk_obstruction | Blocked walkways, overgrowth |
| 8 | utility_line_defect | Power line, cable, insulator issues |
| 9 | flooded_road | Water accumulation, flooding |

## Dataset Sources

### Road Damage & Potholes
- ShixuanAn/RDD_2020
- ShixuanAn/RDD2020
- manot/pothole-segmentation
- keremberke/pothole-segmentation
- hf-vision/road-pothole-segmentation
- Ryukijano/Pothole-detection-Yolov8
- Programmer-RD-AI/road-issues-detection-dataset

### Litter & Waste
- Zesky665/TACO
- keremberke/garbage-object-detection
- UniDataPro/outdoor-garbage
- Yorai/detect-waste
- INS-IntelligentNetworkSolutions/Waste-Dumpsites-DroneImagery

### Visual Pollution & Signage
- gtsaidata/Urban-Visual-Pollution-Dataset
- gtsaidata/Damaged-Traffic-Signs-Dataset

### Infrastructure Defects
- EPDCL/Electrical-Lines-Defect-Detection

### Context Datasets
- dgural/bdd100k
- huggan/cityscapes

## Project Structure

```
.
├── scripts/
│   ├── download_all.py         # Robust HF dataset downloader
│   ├── merge_to_coco.py       # Dataset merger with label remapping
│   └── utils_yolo.py          # Format conversion utilities
├── data/
│   ├── sources/               # Downloaded datasets (original format)
│   ├── .hf_cache/            # HF datasets cache
│   └── merged/
│       ├── images/
│       │   ├── train/        # Training images
│       │   └── val/          # Validation images
│       └── annotations/
│           ├── train.json    # COCO format training annotations
│           └── val.json      # COCO format validation annotations
├── config/
│   ├── label_schema.json     # Target class definitions
│   └── dataset_map_rules.yaml # Label mapping rules
├── seesomething.yaml          # Ultralytics YOLO configuration
├── requirements.txt           # Python dependencies
├── Makefile                  # Build automation
└── README.md                 # This file
```

## Installation

### Prerequisites
- Python 3.8+
- CUDA-capable GPU (recommended for training)
- 50+ GB free disk space
- Hugging Face account (optional, for private datasets)

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd model
```

2. **Install dependencies**
```bash
make setup
source .venv/bin/activate
```

3. **Configure Hugging Face (optional)**
```bash
# For private datasets or faster downloads
huggingface-cli login
```

## Usage

### Download Datasets
```bash
make download
```
Downloads all configured datasets from Hugging Face. Uses `hf_transfer` for optimized speed and supports resume on interruption.

### Merge & Prepare Data
```bash
make merge
```
- Reads all source datasets
- Maps labels to target schema
- Merges into unified COCO format
- Splits into 80% train / 20% validation
- Generates statistics report

### Train YOLO Model
```bash
make train
```
Trains YOLOv8n model with:
- Image size: 640x640
- Batch size: 16
- Epochs: 50
- Early stopping patience: 10
- Auto mixed precision

### Validate Model
```bash
make val
```
Runs validation on the best checkpoint.

### Custom Training
```bash
# Train with custom parameters
yolo detect train \
    model=yolov8m.pt \       # Use medium model
    data=seesomething.yaml \
    imgsz=1024 \            # Larger image size
    epochs=100 \            # More epochs
    batch=8 \               # Smaller batch
    device=0,1              # Multi-GPU
```

## Configuration

### Label Mapping (`config/dataset_map_rules.yaml`)
Edit this file to customize how source dataset labels map to target classes:
```yaml
# Pattern matching (case-insensitive, substring match)
pothole: pothole
crack: road_crack
garbage: overflowing_trash
...
```

### Dataset Selection
Modify `DATASET_CONFIGS` in `scripts/download_all.py` to add/remove datasets.

## Troubleshooting

### Out of Memory
- Reduce batch size in training
- Use smaller model (yolov8n instead of yolov8m)
- Decrease image size (512 instead of 640)

### Download Failures
- Check internet connection
- Verify HF_HUB_ENABLE_HF_TRANSFER=1 is set
- Try increasing HF_HUB_DOWNLOAD_TIMEOUT
- Downloads are resumable - just run again

### Missing Annotations
- Check `data/download_report.json` for failed downloads
- Review unmapped labels in merge output
- Add mapping rules to `dataset_map_rules.yaml`

## Performance Tips

1. **Enable HF Transfer**: Set `HF_HUB_ENABLE_HF_TRANSFER=1` for 5-10x faster downloads
2. **Use GPU**: Training on GPU is 10-50x faster than CPU
3. **Batch Processing**: Larger batch sizes improve GPU utilization
4. **Mixed Precision**: Enabled by default in Ultralytics for faster training

## License

This pipeline aggregates multiple datasets with varying licenses. Please check individual dataset licenses before commercial use:
- TACO: CC BY 4.0
- RDD2020: Check original repository
- Others: See respective Hugging Face dataset cards

## Contributing

Contributions welcome! Please submit PRs for:
- Additional dataset sources
- Improved label mappings
- Performance optimizations
- Bug fixes

## Citation

If you use this pipeline, please cite the original datasets:
```bibtex
@misc{urban-issue-detection-2024,
  title={Urban Issue Detection Dataset Pipeline},
  year={2024},
  publisher={GitHub},
  howpublished={\url{https://github.com/yourusername/urban-detection}}
}
```

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review dataset documentation on Hugging Face
3. Create a new issue with:
   - Error messages
   - System specifications
   - Steps to reproduce


