# InstaConnect

A platform for connecting with influencers and managing tokenized assets.

## Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Register a new web app in your Firebase project
   - Copy the Firebase configuration object from the project settings
   - Update the `firebase-config.js` file with your Firebase configuration

3. **Enable Authentication Methods** (Optional)
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Google Sign-in if you want to use it
   - Configure the authorized domains if needed

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   This will start the development server at `http://localhost:3000`.
   The `./start.sh` script also runs this command for convenience.

## Environment Variables

The following environment variables are used in the application:

- `VITE_FIREBASE_API_KEY`: Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID`: Your Firebase app ID

## Available Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run preview`: Preview the production build locally

## Project Structure

- `app.js`: Main application component
- `firebase-config.js`: Firebase configuration
- `index.html`: Application entry point
- `vite.config.js`: Vite configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `postcss.config.js`: PostCSS configuration

## Dependencies

- React 18
- Firebase 10
- Tailwind CSS 3
- Recharts
- Lucide React
- Vite

## License

MIT
