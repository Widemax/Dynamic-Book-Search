import express, { Application, Request, Response } from 'express';
import path from 'node:path';
import { ApolloServer } from 'apollo-server-express';
import db from './config/connection.js';
import { typeDefs, resolvers } from './schemas/index.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  // With Render's root set to the repository root,
  // the client build is at <repo-root>/client/dist.
  const clientBuildPath = path.join(process.cwd(), 'client', 'dist');
  console.log("Serving static files from:", clientBuildPath);
  
  app.use(express.static(clientBuildPath));

  // Fallback route: serve index.html for any route not handled by the static middleware.
  app.get('*', (req: Request, res: Response): void => {
    if (req.originalUrl.includes('.')) {
      res.status(404).send('Not found');
      return;
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: false, // disable persisted queries warning
  context: ({ req }: { req: Request }) => {
    const authHeader = req.headers.authorization;
    let user;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        user = jwt.verify(token, process.env.JWT_SECRET_KEY || '');
      } catch (e) {
        console.error("JWT verification error:", e);
      }
    }
    return { user };
  },
});

await server.start();
server.applyMiddleware({ app: app as any });

import routes from './routes/index.js';
app.use(routes);

db.once('open', () => {
  app.listen(PORT, () =>
    console.log(`🌍 Now listening on localhost:${PORT}${server.graphqlPath}`)
  );
});
