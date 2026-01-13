# SafeZone - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Prerequisites
- Install Node.js 18+ from https://nodejs.org
- Install MySQL 8+ from https://dev.mysql.com/downloads/
- Ensure MySQL service is running

### Step 2: Setup Database
1. Create a MySQL database named `safezone_db`
2. Note your MySQL username and password

### Step 3: Run Setup Script
**Windows:**
```cmd
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

### Step 4: Configure Database
1. Edit `backend/.env` file
2. Update these values:
   ```env
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   ```

### Step 5: Start the Application
```bash
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Default Login Credentials

**Admin Account:**
- Email: `admin@safezone.edu`
- Password: `admin123`

**Student Account:**
- Email: `john.doe@student.edu`
- Password: `student123`

## 🎯 Key Features to Test

1. **Student Dashboard** - Login as student to view personal dashboard
2. **Emergency Reporting** - Report emergencies with location tracking
3. **Complaint System** - File complaints about campus issues
4. **Admin Panel** - Login as admin to manage all reports and users
5. **Anonymous Reporting** - Report incidents without logging in

## 🛠️ Troubleshooting

**Database Connection Error:**
- Verify MySQL is running
- Check credentials in `backend/.env`
- Ensure database `safezone_db` exists

**Port Already in Use:**
- Change ports in `backend/.env` and `.env.local`

**Build Errors:**
- Delete `node_modules` and run `npm install` again

## 📱 Mobile Responsive
The application is fully responsive and works on all devices.

## 🔒 Security Features
- JWT authentication
- Password hashing
- SQL injection protection
- CORS configuration
- Input validation

## 📊 Database Overview
- **Users:** Student and admin accounts
- **Emergency Reports:** Critical incident tracking
- **Complaints:** General issue management
- **Notifications:** Real-time user alerts
- **Audit Logs:** Complete activity tracking

For detailed documentation, see `README.md`
