# 🕳️ Pothole Detection Model Usage

Your model has been successfully trained! Here's how to use it.

## 📊 Model Performance

- **mAP50**: 66.3% (detection accuracy)
- **Precision**: 70.2% (accuracy of detections)
- **Recall**: 63.0% (percentage of potholes found)
- **Training**: 10 epochs on 738 images

## 🚀 Quick Start

### 1. Test the Model
```bash
# Test on sample validation images
make test

# Or manually:
python test_model.py
```

### 2. Run on Your Images

#### Single Image
```bash
python run_model.py --image your_photo.jpg
```

#### Folder of Images
```bash
python run_model.py --image /path/to/your/photos/
```

#### Live Webcam Detection
```bash
python run_model.py --camera
```

#### Video File
```bash
python run_model.py --video dashcam_video.mp4
```

## 🎛️ Advanced Options

### Adjust Confidence Threshold
```bash
# More sensitive (detects more, but may have false positives)
python run_model.py --image photo.jpg --conf 0.1

# Less sensitive (fewer detections, but more accurate)
python run_model.py --image photo.jpg --conf 0.5
```

### Use Different Model Weights
```bash
python run_model.py --image photo.jpg --model runs/detect/ssai_y8n3/weights/best.pt
```

### Display Results Immediately
```bash
python run_model.py --image photo.jpg --show
```

### Don't Save Annotated Images
```bash
python run_model.py --image photo.jpg --no-save
```

## 📁 Output Files

Results are saved to:
- **Images**: `runs/detect/predict/`
- **Videos**: `runs/detect/predict_video/`
- **Webcam captures**: Current directory as `pothole_detection_*.jpg`

## 💡 Usage Examples

### Road Survey
```bash
# Process all photos from a road survey
python run_model.py --image road_survey_photos/ --conf 0.3
```

### Real-time Detection
```bash
# Use webcam for real-time pothole detection
# Press 'q' to quit, 's' to save current frame
python run_model.py --camera --conf 0.25
```

### Batch Processing
```bash
# Process multiple folders
for folder in survey_day1 survey_day2 survey_day3; do
    python run_model.py --image "$folder/" --conf 0.3
done
```

## 🔧 Troubleshooting

### Model Not Found
If you get a "model not found" error:
1. Make sure training completed: check for `runs/detect/ssai_y8n*/weights/best.pt`
2. Or retrain: `make train`

### Poor Detection Results
- **Too many false positives**: Increase `--conf` (try 0.4-0.6)
- **Missing potholes**: Decrease `--conf` (try 0.1-0.2)
- **Generally poor**: Model may need more training data or epochs

### Performance Issues
- **Slow on CPU**: Normal behavior, consider cloud GPU for faster inference
- **Webcam lag**: Reduce processing frequency in `run_model.py`

## 📈 Model Details

- **Architecture**: YOLOv8n (nano - optimized for speed)
- **Input Size**: 640x640 pixels
- **Classes**: 1 (pothole)
- **Framework**: Ultralytics PyTorch

## 🎯 Best Practices

1. **Good lighting**: Model works best with clear, well-lit images
2. **Appropriate distance**: Similar to training data (road-level photos)
3. **Image quality**: Higher resolution generally gives better results
4. **Confidence tuning**: Adjust based on your use case (precision vs recall)

## 📞 Need Help?

Check the terminal output for detailed information about detections and any error messages.


