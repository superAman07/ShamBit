# ShamBit Platform - Network Access Guide

## 🌐 Accessing from Other Devices on the Same Network

Your ShamBit platform is now configured to be accessible from any device on the same network!

### 📱 **Access URLs**

#### **From Your Computer (localhost)**
- **Website**: http://localhost:5173
- **Admin Portal**: http://localhost:3001  
- **API Server**: http://localhost:3000

#### **From Other Devices on Network**
- **Website**: http://192.168.29.45:5173
- **Admin Portal**: http://192.168.29.45:3001
- **API Server**: http://192.168.29.45:3000

### 📋 **How to Find Your Network IP**

If you need to find your network IP address:

#### **Windows**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

#### **Mac/Linux**
```bash
ifconfig
```
Look for "inet" address under your active network interface.

### 📱 **Testing from Mobile/Other Devices**

1. **Connect to Same WiFi**: Ensure your mobile device/other computer is on the same WiFi network
2. **Open Browser**: Use any web browser on the device
3. **Navigate to Website**: Go to `http://192.168.29.45:5173`
4. **Test Seller Registration**: Fill out the seller registration form
5. **Access Admin Portal**: Go to `http://192.168.29.45:3001` (requires admin login)

### 🔧 **Configuration Details**

#### **Website (Vite)**
```typescript
// vite.config.ts
server: {
  host: '0.0.0.0', // Allow access from network
  port: 5173,
  strictPort: true,
}
```

#### **Admin Portal (Vite)**
```typescript
// vite.config.ts  
server: {
  port: 3001,
  host: '0.0.0.0', // Allow access from any IP
}
```

#### **API Server (Express)**
```typescript
// Binds to all network interfaces
app.listen(config.PORT, '0.0.0.0', () => {
  // Server accessible from network
});
```

### 🔄 **Smart API Detection**

The platform automatically detects the network environment:

- **Local Access**: Uses `localhost:3000` for API calls
- **Network Access**: Uses `192.168.29.45:3000` for API calls
- **No Configuration Needed**: Automatically adapts based on how you access it

### 🧪 **Testing Checklist**

#### **From Mobile Device**
- [ ] Can access website at `http://192.168.29.45:5173`
- [ ] Website loads properly with all styling
- [ ] Seller registration form works
- [ ] Form submission succeeds
- [ ] Can access admin portal at `http://192.168.29.45:3001`

#### **From Another Computer**
- [ ] Website accessible and functional
- [ ] Admin portal accessible (with login)
- [ ] All features work as expected
- [ ] API calls succeed

### 🚨 **Troubleshooting**

#### **Can't Access from Other Devices**

1. **Check Firewall**: Windows Firewall might be blocking connections
   ```bash
   # Allow Node.js through Windows Firewall
   # Go to Windows Defender Firewall > Allow an app
   # Add Node.js if not already allowed
   ```

2. **Check Network**: Ensure devices are on same network
   ```bash
   # Ping test from other device
   ping 192.168.29.45
   ```

3. **Check Ports**: Ensure ports are not blocked
   - Port 5173 (Website)
   - Port 3001 (Admin Portal)  
   - Port 3000 (API Server)

#### **API Calls Failing from Network**

1. **Check CORS**: API server has CORS enabled for all origins
2. **Check Network Detection**: Browser console should show detected API URL
3. **Manual Override**: Set environment variable if needed
   ```bash
   VITE_API_BASE_URL=http://192.168.29.45:3000/api/v1
   ```

### 🔒 **Security Notes**

#### **Development Environment**
- Network access is enabled for development/testing
- All devices on same network can access the platform
- No authentication required for website access

#### **Production Deployment**
- Use proper domain names and SSL certificates
- Implement proper firewall rules
- Restrict admin portal access
- Use environment-specific API URLs

### 📊 **Network Performance**

#### **Expected Performance**
- **Local Access**: ~1-5ms response time
- **Network Access**: ~10-50ms response time (depending on WiFi)
- **Mobile Access**: Similar to network access

#### **Optimization Tips**
- Use 5GHz WiFi for better performance
- Ensure strong WiFi signal on mobile devices
- Close unnecessary apps on mobile for better performance

---

## 🎉 **Ready to Test!**

Your ShamBit platform is now fully accessible across your network. You can:

1. **Demo on Mobile**: Show the seller registration to potential sellers
2. **Admin on Tablet**: Manage sellers and customers from any device
3. **Multi-Device Testing**: Test the complete workflow across devices
4. **Team Collaboration**: Multiple team members can access different parts

**All services automatically adapt to network access - no additional configuration needed!** 🌟