# ScreenTutorial

Extension Firefox qui génère des tutoriels pas-à-pas à partir de vos sessions de navigation. Cliquez, naviguez, remplissez des formulaires — chaque action significative est capturée avec une capture d'écran automatique.

## Fonctionnalités

- **Enregistrement automatique** des clics, saisies et navigations
- **Capture d'écran** à chaque action significative
- **Indicateur visuel** (badge REC) pendant l'enregistrement
- **Éditeur complet** : renommer les étapes, supprimer, réordonner par drag & drop
- **Export Markdown** (.md) avec screenshots en base64
- **Export HTML** autonome (fichier unique, ouvrable dans n'importe quel navigateur)
- **Export PDF** via la boîte de dialogue d'impression du navigateur

## Installation

### Depuis les sources (développement)

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/VOTRE_USER/ScreenTutorial.git
   ```
2. Ouvrir Firefox et aller à `about:debugging#/runtime/this-firefox`
3. Cliquer **"Charger un module temporaire..."**
4. Sélectionner le fichier `manifest.json` du dépôt

## Utilisation

1. Cliquer sur l'icône **ScreenTutorial** dans la barre d'outils
2. Saisir un **titre** pour le tutoriel
3. Cliquer **"Démarrer l'enregistrement"**
4. Naviguer normalement sur le site web cible
5. Cliquer à nouveau sur l'icône puis **"Arrêter l'enregistrement"**
6. Cliquer **"Modifier et exporter"** pour ouvrir l'éditeur
7. Éditer les descriptions, supprimer les étapes inutiles, réordonner
8. Exporter en **.md**, **.html** ou **.pdf**

## Structure du projet

```
ScreenTutorial/
├── manifest.json       # Manifest Firefox (V2)
├── background.js       # Gestion d'état, screenshots, navigation
├── content.js          # Détection des interactions utilisateur
├── popup/              # Popup de contrôle (start/stop)
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── editor/             # Éditeur pleine page (review & export)
│   ├── editor.html
│   ├── editor.css
│   └── editor.js
└── icons/
    └── icon.svg
```

## Licence

MIT
