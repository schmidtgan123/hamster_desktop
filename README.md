# Hamster Desktop

A tiny Electron desktop hamster pet.

## Development

```sh
npm install
npm start
```

The hamster can be dragged around the desktop. While dragging, it plays the walk animation and flips direction based on horizontal movement.

The app is written in TypeScript and compiles into `dist/` before launch. Hamster behavior is configured from `config/behaviors.yaml`; if that file cannot be parsed at startup, the app logs the error and falls back to the built-in default behavior tree.

Useful checks:

```sh
npm run build
npm run test:config
```

## Packaging

Local builds:

```sh
npm run dist:mac
npm run dist:win
```

GitHub Actions builds macOS and Windows packages from `.github/workflows/build-desktop.yml` when run manually from the Actions tab. The generated files are uploaded as workflow artifacts.
