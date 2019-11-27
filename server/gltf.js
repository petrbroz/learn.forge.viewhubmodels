/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const fse = require('fs-extra');
const oauth = require('./oauth');
const { ModelDerivativeClient, ManifestHelper } = require('forge-server-utils');
const { SvfReader, GltfWriter } = require('forge-convert-utils');

let router = express.Router();

// GET /api/forge/gltf/:urn
router.get('/api/forge/gltf/:urn', async (req, res, next) => {
    try {
        const urn = req.params.urn.replace(/=/g, '');
        const hash = computeHash(urn);
        const outputDir = path.join(__dirname, '..', 'preview', hash);
        if (fse.existsSync(outputDir)) {
            if (fse.existsSync(path.join(outputDir, 'output.gltf'))) {
                res.json({ temporary_url: `/preview/${hash}/output.gltf` });
            } else if (fse.existsSync(path.join(outputDir, 'error.json'))) {
                res.status(400).sendFile(path.join(outputDir, 'error.json'));
            } else {
                res.send(201).end('Conversion in process.');
            }
        } else {
            const credentials = new oauth(req.session);
            const token = await credentials.getTokenInternal();
            generateGltf(urn, outputDir, token.access_token);
            res.send(201).end('Starting the conversion process...');
        }
    } catch(err) {
        next(err);
    }
});

function computeHash(urn) {
    const hash = crypto.createHash('sha256');
    return hash.update(urn).digest('hex').substring(0, 4);
}

async function generateGltf(urn, outputDir, token) {
    const ReaderOptions = { log: console.log };
    const WriterOptions = {
        deduplicate: true,
        skipUnusedUvs: true,
        binary: false,
        compress: true,
        center: true,
        ignoreLineGeometry: true,
        ignorePointGeometry: true,
        log: console.log
    };
    fse.mkdirpSync(outputDir);
    try {
        const modelDerivativeClient = new ModelDerivativeClient({ token });
        const helper = new ManifestHelper(await modelDerivativeClient.getManifest(urn));
        const derivatives = helper.search({ type: 'resource', role: 'graphics' });
        if (derivatives.length > 0) {
            // For now we're only translating the _first_ derivative
            const guid = derivatives[0].guid;
            const reader = await SvfReader.FromDerivativeService(urn, guid, { token });
            const svf = await reader.read(ReaderOptions);
            const writer = new GltfWriter(WriterOptions);
            await writer.write(svf, outputDir);
        }
    } catch(err) {
        if (err.isAxiosError) {
            fse.writeJsonSync(path.join(outputDir, 'error.json'), err.response.data);
        } else {
            fse.writeJsonSync(path.join(outputDir, 'error.json'), err);
        }
    }
}

module.exports = router;
