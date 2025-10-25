#!/usr/bin/env python3
"""
Quick Model Test Script
======================

Test your trained pothole detection model on sample images.
"""

import os
from pathlib import Path
from run_model import PotholeDetector

def main():
    print("🧪 Testing Pothole Detection Model")
    print("=" * 40)
    
    # Initialize detector
    detector = PotholeDetector()
    
    # Test on validation images
    val_images_path = Path("data/merged/images/val")
    
    if val_images_path.exists():
        print(f"🔍 Testing on validation images from: {val_images_path}")
        
        # Get first few validation images
        image_files = list(val_images_path.glob("*.jpg"))[:5]
        
        if image_files:
            print(f"Testing on {len(image_files)} sample images:")
            
            for i, img_file in enumerate(image_files, 1):
                print(f"\n--- Test {i}/{len(image_files)} ---")
                detector.detect_image(img_file, conf_threshold=0.25, save=True, show=False)
                
            print(f"\n✅ Test complete!")
            print(f"📁 Results saved to: runs/detect/predict/")
            print(f"🖼️  Check the annotated images to see detection results!")
            
        else:
            print("❌ No validation images found")
    else:
        print("❌ Validation images folder not found")
        print("💡 Try running on a custom image:")
        print("   python run_model.py --image your_image.jpg")

if __name__ == "__main__":
    main()


