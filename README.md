# LinkedIn Premium Coupon Redemption System

A web application for managing and redeeming LinkedIn Premium coupon codes.

## Features

- Admin panel for managing coupon codes
- Secure authentication for admin access
- Unique code generation for each coupon
- One-time use coupon redemption
- IP tracking and logging
- User-friendly redemption interface

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- MongoDB
- NextAuth.js

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/linkedin-coupon
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-hashed-password
   ```

   To generate a hashed password, you can use the following command:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application:
   - Admin panel: http://localhost:3000/admin/login
   - Redemption page: http://localhost:3000/redeem

## Usage

### Admin Panel

1. Log in with your admin credentials
2. Add new coupon codes by providing LinkedIn Premium redeem links
3. View all coupons and their redemption status
4. Monitor redemption logs including IP addresses and timestamps

### User Redemption

1. Visit the redemption page
2. Enter the coupon code provided by the admin
3. Get the LinkedIn Premium redeem link
4. Use the link to activate LinkedIn Premium

## Security Features

- Secure admin authentication
- One-time use coupon codes
- IP tracking for redemption
- Protected API endpoints
- Environment variable configuration

## Development

- The application uses TypeScript for type safety
- Tailwind CSS for styling
- MongoDB for data storage
- NextAuth.js for authentication

## License

MIT 