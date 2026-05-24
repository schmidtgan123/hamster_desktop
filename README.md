# Hamster Desktop

A tiny Electron desktop hamster pet.

## Development

```sh
npm install
npm start
```

The hamster can be dragged around the desktop. While dragging, it plays the walk animation and flips direction based on horizontal movement.

The app is written in TypeScript and compiles into `dist/` before launch. Hamster behavior is configured from `behaviors.yaml` in Electron's user data directory. On first launch, the app copies the bundled `config/behaviors.yaml` there. If the user config cannot be parsed at startup, the app logs the error and falls back to the bundled config, then to the built-in default behavior tree.

Installed config locations:

- macOS: `~/Library/Application Support/Hamster Pet/behaviors.yaml`
- Windows: `%APPDATA%\Hamster Pet\behaviors.yaml`

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
