# Run FORM locally

This export contains the published version 12 source, including the latest inward-facing cable fly grips, the 18-exercise collection, the Sketchfab athlete (CC BY 4.0, credited in README.md), and its authoring scripts.

Extract the ZIP and open a terminal in the form-chest-studio folder.

```sh
python -m http.server 8000 --directory dist
```

On Windows, `py -m http.server 8000 --directory dist` also works.
Open http://localhost:8000 in your browser. Do not open index.html directly.

No npm install or API key is needed to run the website. See README.md for the code map and avatar regeneration instructions. Regenerating the avatar needs Blender (to run scripts/export-charter-blender.py) and Node 22.15+; see README.md. The prebuilt avatar is already included.

Source revision: f1fa66dd5304d7a684616f54fb234f488da6a6eb
