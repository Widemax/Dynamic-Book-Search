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
  const clientBuildPath = path.join(process.cwd(), 'client', 'dist');
  app.use(express.static(clientBuildPath));

  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: false, 
  context: ({ req }: { req: Request }) => {
    const authHeader = req.headers.authorization;
    let user;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        user = jwt.verify(token, process.env.JWT_SECRET_KEY || '');
      } catch (e) {
        console.error(e);
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
