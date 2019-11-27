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

function launchViewer(urn) {
  const $container = $('#forgeViewer');
  $.get({
    url: '/api/forge/gltf/' + urn,
    contentType: 'application/json',
    success: function (res) {
      if (res.temporary_url) {
        const url = window.location.href.replace(/\/$/, '') + res.temporary_url;
        $container.html(`
          <p>The glTF translation is complete!</p>
          <p>Open this URL in your Unity viewer: <a href="${url}">${url}</a></p>
          <p>Note: the translated files are <em>not</em> stored permanently; the link is only meant to be used for quick experiments.</p>
        `);
      } else {
        $container.html('glTF translation in progress.');
      }
    },
    error: function (err) {
      $container.html('glTF translation failed: ' + JSON.stringify(err));
    }
  });
}
