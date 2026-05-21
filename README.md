# Hamster Desktop

A tiny Electron desktop hamster pet.

## Development

```sh
npm install
npm start
```

The hamster can be dragged around the desktop. While dragging, it plays the walk animation and flips direction based on horizontal movement.

## Packaging

Local builds:

```sh
npm run dist:mac
npm run dist:win
```

GitHub Actions builds macOS and Windows packages from `.github/workflows/build-desktop.yml` when run manually from the Actions tab. The generated files are uploaded as workflow artifacts.
