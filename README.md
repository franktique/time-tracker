# Time Tracker

This is a comprehensive time tracking application built with Next.js 15, React 19, TypeScript, and AWS Cognito for authentication.

## AWS Cognito Setup

To enable user authentication, you'll need to configure AWS Cognito. Follow these steps:

### Step 1: Create an AWS Account
- Sign up for an AWS account at https://aws.amazon.com if you don't have one
- Access the AWS Console and search for "Cognito"

### Step 2: Create a User Pool
1. Open AWS Cognito in the AWS Console
2. Click "Create user pool"
3. Configure sign-in experience:
   - Choose "Email" as the sign-in option
   - Keep "Username" if you prefer username-based login
4. Configure security requirements:
   - Set password policy (minimum 8 characters recommended)
   - Enable MFA if desired (optional for development)

### Step 3: Configure Sign-up Experience
1. Choose required attributes: Email (required)
2. Configure message delivery:
   - Choose "Send email with Cognito" for development
   - For production, configure SES for better email delivery

### Step 4: Integrate Your App
1. Give your user pool a name (e.g., "time-tracker-users")
2. Create an app client:
   - App client name: "time-tracker-web"
   - Check "Generate a client secret" (optional, not needed for web apps)
   - Enable "Authentication flows": ALLOW_USER_SRP_AUTH

### Step 5: Get Your Configuration Values
After creating the user pool, note down:
- **User Pool ID**: Found in General Settings
- **App Client ID**: Found in App Clients section

### Step 6: Configure Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values with your actual AWS Cognito configuration:

```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id-here
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=your-app-client-id-here
```

### Step 7: Configure Hosted UI (Optional)
1. In your user pool, go to "App client settings"
2. Enable "Hosted UI"
3. Set callback and sign out URLs:
   - Callback URL: http://localhost:3000 (for development)
   - Sign out URL: http://localhost:3000

### Step 8: Test Your Setup
1. Start your development server
2. Try creating a new account - you should receive a confirmation email
3. Confirm your account using the code sent to your email
4. Login with your credentials

### Step 9: Production Considerations
For production deployment:
- Update callback URLs to your production domain
- Configure custom domain for Cognito (optional)
- Set up SES for email delivery
- Enable CloudWatch logging for debugging

### Step 10: Additional Security (Recommended)
1. Enable advanced security features in Cognito
2. Configure user pool policies
3. Set up CloudTrail for audit logging
4. Consider implementing refresh token rotation

## Getting Started

First, set up AWS Cognito following the steps above, then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
