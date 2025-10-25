# Update Gym Coordinates on Render - Quick Guide

## 🎯 One-Time Setup (Takes 2 minutes)

### Method 1: Via Render Dashboard (Easiest)

1. **Go to:** https://dashboard.render.com/
2. **Login** with your account
3. **Click** on `ns-fitness-backend` service
4. **Click** "Environment" tab on the left
5. **Find and Update these 2 variables:**
   ```
   GYM_LATITUDE  →  27.544129
   GYM_LONGITUDE →  76.593373
   ```
6. **Click** "Save Changes" button at bottom
7. **Wait** 2-3 minutes for auto-redeploy

✅ **Done!** Coordinates updated to actual gym location.

---

## 📍 Coordinates Reference

### Current (Production - Gym):
```
GYM_LATITUDE=27.544129
GYM_LONGITUDE=76.593373
GYM_RADIUS_METERS=100
```

### Testing (Home - if needed):
```
GYM_LATITUDE=27.542603
GYM_LONGITUDE=76.596084
GYM_RADIUS_METERS=100
```

---

## 🔍 Verify on Map

**Gym Location:** https://www.google.com/maps?q=27.544129,76.593373
**Home Location:** https://www.google.com/maps?q=27.542603,76.596084

---

## ✅ After Update

Self check-in will now:
- ✅ Work only at gym (27.544129, 76.593373)
- ✅ Block check-ins from other locations
- ✅ Show accurate distance from gym

---

## 🚀 Quick Test

1. Try self check-in from home → Should fail
2. Try self check-in at gym → Should work!


