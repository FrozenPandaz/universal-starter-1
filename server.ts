import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import { platformServer, PlatformState, INITIAL_CONFIG } from '@angular/platform-server';
import { enableProdMode } from '@angular/core';

import * as express from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
import { Router } from '@angular/router';

// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Express server
const app = express();

const PORT = process.env.PORT || 4000;
const DIST_FOLDER = join(process.cwd(), 'dist');

// Our index.html we'll use as our template
const template = readFileSync(join(DIST_FOLDER, 'browser', 'index.html')).toString();

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const { AppServerModuleNgFactory, LAZY_MODULE_MAP } = require('./dist/server/main.bundle');

(async () => {
  const platformRef = await platformServer([
    {
      provide: INITIAL_CONFIG,
      useValue: {
        document: template,
        url: '/'
      }
    },
    provideModuleMap(LAZY_MODULE_MAP)
  ]).bootstrapModuleFactory(AppServerModuleNgFactory);
  const platformState = platformRef.injector.get(PlatformState);
  const router = platformRef.injector.get(Router);

  app.set('view engine', 'html');
  app.set('views', join(DIST_FOLDER, 'browser'));

  /* - Example Express Rest API endpoints -
    app.get('/api/**', (req, res) => { });
  */

  // Server static files from /browser
  app.get('*.*', express.static(join(DIST_FOLDER, 'browser'), {
    maxAge: '1y'
  }));

  // ALl regular routes use the Universal engine
  app.get('*', async (req, res) => {
    // Navigate to the request's URL
    await router.navigateByUrl(req.originalUrl);
    // Serialize State after navigation completes
    res.send(platformState.renderToString());
  });

  // Start up the Node server
  app.listen(PORT, () => {
    console.log(`Node Express server listening on http://localhost:${PORT}`);
  });
})();
