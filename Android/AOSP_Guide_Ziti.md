# Building AOSP for OnePlus Nord CE 3 (ziti) - Complete Guide

## Device Information
- **Device:** OnePlus Nord CE 3 (Indian Variant)
- **Model:** CPH2569
- **Codename:** ziti
- **SoC:** Snapdragon 782G (SM7325-AF)
- **Architecture:** ARM64
- **Stock Android:** Android 13/14 (OxygenOS 13/14)

### ⚠️ CRITICAL WARNING
**DO NOT update to OxygenOS 15 (build 15.0.0.1301) if you plan to flash custom ROMs!** This update has caused serious issues with custom ROM flashing and EDL mode. Stay on Android 13/14 firmware for ROM development.

---

## Good News for Beginners!

Unlike starting completely from scratch, device trees and ROMs already exist for ziti:
- **LineageOS 21** builds available (by pjgowtham)
- **Evolution X** builds available
- Active development community on XDA Forums
- You can use existing device trees as a reference or base

---

## Part 1: WSL2 Optimization & Setup

### Step 1.1: Configure WSL2 for AOSP Building

Create/edit `.wslconfig` in your Windows user folder (`C:\Users\YourName\.wslconfig`):

```ini
[wsl2]
# Allocate most of your RAM (leave 4GB for Windows)
memory=12GB

# Use most CPU cores (leave 2 for Windows)
processors=6

# Swap file for when RAM runs out
swap=16GB

# Disable page reporting (faster builds)
pageReporting=false

# Network settings
localhostForwarding=true
```

After editing, restart WSL2 from PowerShell (admin):
```powershell
wsl --shutdown
```

### Step 1.2: Install Ubuntu 22.04 LTS

If you don't have WSL2 set up yet:
```powershell
wsl --install -d Ubuntu-22.04
```

### Step 1.3: WSL2 Best Practices for AOSP

**CRITICAL:** Store AOSP source in Linux filesystem, NOT `/mnt/c/`
- ✅ Good: `/home/yourusername/aosp`
- ❌ Bad: `/mnt/c/Users/YourName/aosp` (10x slower!)

---

## Part 2: Install Required Dependencies

Launch your WSL2 Ubuntu terminal and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build dependencies
sudo apt install -y \
    git-core gnupg flex bison build-essential zip curl zlib1g-dev \
    gcc-multilib g++-multilib libc6-dev-i386 libncurses5 \
    lib32ncurses5-dev x11proto-core-dev libx11-dev lib32z1-dev \
    libgl1-mesa-dev libxml2-utils xsltproc unzip fontconfig \
    python3 python3-pip python-is-python3 bc rsync

# Install repo tool
sudo curl https://storage.googleapis.com/git-repo-downloads/repo > /usr/local/bin/repo
sudo chmod a+x /usr/local/bin/repo

# Configure git (use your actual info)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Part 3: Preparing Your Device

### Step 3.1: Unlock Bootloader

**WARNING: This will wipe all data!**

1. Enable Developer Options (tap Build Number 7 times in Settings > About Phone)
2. Enable OEM Unlocking and USB Debugging
3. Boot to bootloader:
   ```bash
   adb reboot bootloader
   ```
4. Unlock bootloader:
   ```bash
   fastboot flashing unlock
   ```

### Step 3.2: Extract Proprietary Blobs

You'll need vendor files from your stock ROM. Two methods:

**Method A: Extract from Running Device**
```bash
# Clone extraction tool
git clone https://github.com/LineageOS/android_tools_extract-utils
cd android_tools_extract-utils

# Connect device with USB debugging enabled
adb root
adb pull /system system/
adb pull /vendor vendor/
adb pull /product product/
```

**Method B: Download Stock ROM**
- Download OxygenOS firmware for ivan from OnePlus website
- Extract using payload_dumper or similar tools

---

## Part 4: Setting Up Device Tree

Since ivan is relatively new, you may need to create/adapt a device tree.

### Step 4.1: Find Existing Device Trees

Good news! Device trees already exist for ziti:
```bash
# Existing repositories on GitHub:
# - pjgowtham/android_device_oneplus_ziti (LineageOS 21)
# - LineageOS unofficial builds available
# - Evolution X device trees

# You can use these as a base or reference
```

### Step 4.2: Create Device Tree Structure

```bash
mkdir -p ~/android/device/oneplus/ziti
cd ~/android/device/oneplus/ziti

# Basic structure needed:
# AndroidProducts.mk
# aosp_ivan.mk
# BoardConfig.mk
# device.mk
# lineage.dependencies (if using LineageOS base)
# proprietary-files.txt
# extract-files.sh
# setup-makefiles.sh
```

### Step 4.3: Key Device Tree Files

**BoardConfig.mk** (hardware configuration):
```makefile
# Platform
TARGET_BOARD_PLATFORM := lahaina
TARGET_BOOTLOADER_BOARD_NAME := ziti

# Architecture
TARGET_ARCH := arm64
TARGET_ARCH_VARIANT := armv8-a
TARGET_CPU_ABI := arm64-v8a
TARGET_CPU_VARIANT := cortex-a76

TARGET_2ND_ARCH := arm
TARGET_2ND_ARCH_VARIANT := armv8-a
TARGET_2ND_CPU_ABI := armeabi-v7a
TARGET_2ND_CPU_VARIANT := cortex-a55

# Kernel
TARGET_KERNEL_SOURCE := kernel/oneplus/ziti
TARGET_KERNEL_CONFIG := ziti_defconfig
BOARD_KERNEL_CMDLINE := <get from stock boot.img>
BOARD_KERNEL_BASE := 0x00000000
BOARD_KERNEL_PAGESIZE := 4096

# Partitions
BOARD_BOOTIMAGE_PARTITION_SIZE := <check your device>
BOARD_SYSTEMIMAGE_PARTITION_SIZE := <check your device>
BOARD_USERDATAIMAGE_PARTITION_SIZE := <check your device>
BOARD_VENDORIMAGE_PARTITION_SIZE := <check your device>

# File systems
TARGET_USERIMAGES_USE_EXT4 := true
TARGET_USERIMAGES_USE_F2FS := true
BOARD_VENDORIMAGE_FILE_SYSTEM_TYPE := ext4

# Recovery
TARGET_RECOVERY_FSTAB := device/oneplus/ziti/recovery.fstab
```

**aosp_ziti.mk** (product definition):
```makefile
$(call inherit-product, $(SRC_TARGET_DIR)/product/core_64_bit.mk)
$(call inherit-product, $(SRC_TARGET_DIR)/product/full_base_telephony.mk)

# Device
$(call inherit-product, device/oneplus/ziti/device.mk)

# Product
PRODUCT_NAME := aosp_ziti
PRODUCT_DEVICE := ziti
PRODUCT_BRAND := OnePlus
PRODUCT_MODEL := Nord CE 3
PRODUCT_MANUFACTURER := OnePlus

PRODUCT_GMS_CLIENTID_BASE := android-oneplus
```

---

## Part 5: Getting Kernel Source

### Step 5.1: Clone OnePlus Kernel

```bash
mkdir -p ~/android/kernel/oneplus
cd ~/android/kernel/oneplus

# OnePlus releases kernel sources on their open source portal
# For ziti, check:
# - https://github.com/OnePlus-sm7325 (community repos)
# - OnePlus Open Source Software page (official kernel)
# - Existing LineageOS kernel repos for ziti

git clone <oneplus-kernel-repo> ziti
cd ziti

# Checkout the branch matching your stock firmware version
git checkout <branch-for-android-13-or-14>
```

---

## Part 6: Download AOSP Source

### Step 6.1: Initialize AOSP Repository

```bash
# Create working directory
mkdir -p ~/android/aosp
cd ~/android/aosp

# Initialize repo for Android 13 (T)
repo init -u https://android.googlesource.com/platform/manifest -b android-13.0.0_r82

# For Android 14 (use this for newer builds):
# repo init -u https://android.googlesource.com/platform/manifest -b android-14.0.0_r29
```

### Step 6.2: Sync AOSP Source

**WARNING: This downloads 100-150GB!**

```bash
# Sync with 4 parallel jobs (adjust based on your internet)
repo sync -c -j4 --force-sync --no-clone-bundle --no-tags

# This will take HOURS (possibly 6-12 hours on first run)
```

**Pro Tip:** Use screen or tmux to avoid interruption:
```bash
sudo apt install screen
screen -S aosp_sync
repo sync -c -j4 --force-sync --no-clone-bundle --no-tags
# Press Ctrl+A then D to detach
# Later: screen -r aosp_sync to reattach
```

---

## Part 7: Set Up Local Manifests

Create local manifests to include your device-specific repos:

```bash
mkdir -p ~/android/aosp/.repo/local_manifests
nano ~/android/aosp/.repo/local_manifests/ziti.xml
```

**ziti.xml** example:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest>
    <!-- Device tree -->
    <project name="YourGitHub/android_device_oneplus_ziti" 
             path="device/oneplus/ziti" 
             remote="github" 
             revision="android-13" />
    
    <!-- Kernel -->
    <project name="YourGitHub/android_kernel_oneplus_ziti" 
             path="kernel/oneplus/ziti" 
             remote="github" 
             revision="android-13" />
    
    <!-- Vendor blobs -->
    <project name="YourGitHub/android_vendor_oneplus_ziti" 
             path="vendor/oneplus/ziti" 
             remote="github" 
             revision="android-13" />
             
    <!-- Alternative: Use existing pjgowtham repos as base -->
    <!-- 
    <project name="pjgowtham/android_device_oneplus_ziti" 
             path="device/oneplus/ziti" 
             remote="github" 
             revision="lineage-21" />
    -->
</manifest>
```

Then sync again:
```bash
repo sync
```

---

## Part 8: Configure ccache (CRITICAL for Speed)

```bash
# Install ccache
sudo apt install ccache

# Set ccache directory (in Linux filesystem!)
export USE_CCACHE=1
export CCACHE_DIR=~/.ccache

# Set cache size (50-100GB recommended)
ccache -M 100G

# Add to ~/.bashrc for persistence
echo "export USE_CCACHE=1" >> ~/.bashrc
echo "export CCACHE_DIR=~/.ccache" >> ~/.bashrc
```

---

## Part 9: Building AOSP

### Step 9.1: Set Up Build Environment

```bash
cd ~/android/aosp

# Load build environment
source build/envsetup.sh

# Select your device
lunch aosp_ziti-userdebug

# Options explained:
# - userdebug: Debuggable, root access (recommended for testing)
# - user: Production build, no root
# - eng: Engineering build, most debugging features
```

### Step 9.2: Start the Build

```bash
# Use all available cores (-jX where X = core count)
# For 16GB RAM, use j6 to j8
make -j6

# Or use this shortcut:
mka bacon
```

**Build Time Estimates:**
- First build: 4-8 hours (with ccache empty)
- Subsequent builds: 30 minutes - 2 hours (with ccache)

### Step 9.3: Monitor Build Progress

The build will compile thousands of files. Watch for errors in red.

Common first-build issues:
- Missing dependencies → Install missing packages
- Kernel build errors → Check kernel config
- Device tree errors → Fix BoardConfig.mk syntax

---

## Part 10: Flash Your ROM

### Step 10.1: Locate Built Files

After successful build:
```bash
cd ~/android/aosp/out/target/product/ziti/

# You'll find:
# - boot.img (kernel + ramdisk)
# - system.img
# - vendor.img
# - userdata.img (optional)
# - recovery.img (if built)
```

### Step 10.2: Flash via Fastboot

```bash
# Boot to bootloader
adb reboot bootloader

# Flash images
fastboot flash boot boot.img
fastboot flash system system.img
fastboot flash vendor vendor.img

# Wipe data (first time only)
fastboot -w

# Reboot
fastboot reboot
```

**Alternative: Create Flashable ZIP**

Use tools like:
- Android Image Kitchen (to repack boot.img)
- create_flashable_zip.sh scripts from LineageOS

---

## Part 11: Troubleshooting

### Build Errors

**"Out of memory"**
```bash
# Reduce parallel jobs
make -j4  # instead of -j6

# Add more swap
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**"Kernel build failed"**
- Check kernel source compatibility
- Verify defconfig exists
- May need to use prebuilt kernel initially

**"Missing vendor blobs"**
- Extract from stock ROM properly
- Check proprietary-files.txt matches your device
- Some blobs may be in /system/system_ext or /product

### Boot Issues

**Bootloop**
- Check kernel compatibility
- Verify SELinux policies
- May need to start with permissive SELinux initially

**Black screen**
- Display drivers may need fixing in device tree
- Check framebuffer configuration

**No modem/WiFi**
- Missing firmware files
- Check vendor blob extraction
- Verify radio.img/modem.img flashed

---

## Part 12: Optimization Tips

### For Faster Builds

1. **Use SSD in WSL2:**
   - Store entire source on ext4 partition
   - Never use `/mnt/c/` Windows filesystem

2. **Increase ccache:**
   ```bash
   ccache -M 150G
   ```

3. **Use prebuilt tools:**
   ```bash
   export USE_PREBUILT_CACHE=1
   ```

4. **Disable unused modules:**
   Edit device.mk to skip building unnecessary apps

### For Better ROM

1. **Enable performance governor:**
   - Add to device tree: `TARGET_KERNEL_ADDITIONAL_FLAGS`

2. **Optimize compiler flags:**
   - Add `-O3` optimization in BoardConfig.mk

3. **Strip debug symbols:**
   ```bash
   export PRODUCT_MINIMIZE_JAVA_DEBUG_INFO=true
   ```

---

## Part 13: Next Steps

### After First Successful Build

1. **Test thoroughly:**
   - Cellular network
   - WiFi/Bluetooth
   - Camera
   - Audio (calls, media)
   - Sensors
   - GPS
   - Fingerprint

2. **Fix issues:**
   - Check logcat: `adb logcat`
   - Fix broken features in device tree
   - Update vendor blobs if needed

3. **Customize:**
   - Add custom features
   - Remove bloat
   - Modify system apps
   - Create custom kernel

### Sharing Your ROM

1. **Create GitHub repos:**
   - Device tree
   - Kernel
   - Vendor (if license allows)

2. **Build flashable ZIP:**
   - Use TWRP-compatible zip format
   - Include installation instructions

3. **Write XDA thread:**
   - Share your work
   - Get feedback
   - Help other developers

---

## Resources

### Essential Links

- **AOSP Source:** https://source.android.com
- **OnePlus Open Source:** https://github.com/OnePlus-sm7325
- **XDA Forums:** https://forum.xda-developers.com/f/oneplus-nord-ce-3.12847/
- **Telegram:** Android Building & Development groups

### Device Tree References (ziti-specific)

- **pjgowtham's LineageOS 21 device tree** (GitHub)
- **Evolution X device trees for ziti**
- **TWRP device trees for ziti** (for recovery)
- Other Snapdragon 782G devices for reference

### Tools

- **Android Image Kitchen:** Boot image unpacking
- **payload_dumper:** Extract stock ROM
- **sdat2img:** Convert sparse images
- **adb/fastboot:** Android Debug Bridge

---

## Important Notes

⚠️ **WARNINGS:**
- Building ROMs can brick your device if done incorrectly
- Always have a working stock ROM backup
- First builds WILL have bugs - don't daily drive immediately
- Keep stock recovery as backup

✅ **Best Practices:**
- Read AOSP documentation thoroughly
- Study existing device trees
- Test incrementally
- Ask for help in developer communities
- Keep detailed build notes

---

## Quick Reference Commands

```bash
# Sync latest changes
repo sync -j4

# Clean build (when needed)
make clobber

# Set up environment
source build/envsetup.sh
lunch aosp_ziti-userdebug

# Build
make -j6

# Check build output
cd out/target/product/ziti/

# Flash
adb reboot bootloader
fastboot flash boot boot.img
fastboot flash system system.img
fastboot flash vendor vendor.img
fastboot reboot
```

---

Good luck with your build! Remember: your first build will likely have issues, and that's completely normal. The Android building community is very helpful - don't hesitate to ask questions on XDA or Telegram groups.
