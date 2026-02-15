#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const AdmZip = require('adm-zip');

const ROOT_DIR = process.cwd();
const TARGET = process.argv[2] || 'all';
const VALID_TARGETS = new Set([
    'chrome',
    'firefox',
    'all',
    'cowboy:chrome',
    'cowboy:firefox',
    'cowboy:all'
]);

if (!VALID_TARGETS.has(TARGET)) {
    console.error('Usage: node tools/mkbuild.js [chrome|firefox|all|cowboy:chrome|cowboy:firefox|cowboy:all]');
    process.exit(1);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readVersion() {
    const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
        throw new Error('Unable to determine version: public/manifest.json is missing.');
    }

    const { version } = readJson(manifestPath);
    if (!version) {
        throw new Error('Unable to determine version from public/manifest.json.');
    }

    return version;
}

function updateManifestVersion(filePath, version) {
    const manifest = readJson(filePath);
    manifest.version = version;
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n');
}

function updateReadmeVersion(filePath, version) {
    if (!fs.existsSync(filePath)) return;
    const readme = fs.readFileSync(filePath, 'utf-8');
    const versionPattern = /(# Send2Mealie \()\d+\.\d+\.\d+(\))/;

    if (!versionPattern.test(readme)) {
        throw new Error(`Unable to update version in ${filePath}.`);
    }

    const updated = readme.replace(versionPattern, `$1${version}$2`);
    fs.writeFileSync(filePath, updated);
}

function updatePopupVersion(filePath, version) {
    const popupHtml = fs.readFileSync(filePath, 'utf-8');
    const versionPattern = /(^[\t ]*)\d+\.\d+\.\d+([\t ]*)\r?$/m;

    if (!versionPattern.test(popupHtml)) {
        throw new Error(`Unable to update version in ${filePath}.`);
    }

    const updated = popupHtml.replace(versionPattern, `$1${version}$2`);
    fs.writeFileSync(filePath, updated);
}

function updateProjectVersions(version) {
    const popupFiles = [
        path.join(ROOT_DIR, 'public', 'shared', 'popup.html'),
        path.join(ROOT_DIR, 'cowboy', 'shared', 'popup.html')
    ];
    const manifestFiles = [
        path.join(ROOT_DIR, 'public-firefox', 'manifest.json'),
        path.join(ROOT_DIR, 'cowboy', 'chrome', 'manifest.json'),
        path.join(ROOT_DIR, 'cowboy', 'firefox', 'manifest.json')
    ];

    popupFiles.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
            updatePopupVersion(filePath, version);
        }
    });

    manifestFiles.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
            updateManifestVersion(filePath, version);
        }
    });

    updateReadmeVersion(path.join(ROOT_DIR, 'README.md'), version);
}

function runScript(args) {
    execFileSync('node', args, { stdio: 'inherit' });
}

function runWebpack(configPath) {
    runScript(['./node_modules/webpack/bin/webpack.js', '--mode=production', '--config', configPath]);
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function removeOldPackages(distDir, projectName) {
    if (!fs.existsSync(distDir)) return;
    const entries = fs.readdirSync(distDir, { withFileTypes: true });
    const extensions = ['.zip', '.xpi'];
    entries.forEach((entry) => {
        if (!entry.isFile()) return;
        if (!entry.name.startsWith(`${projectName}-`)) return;
        if (!extensions.some((ext) => entry.name.endsWith(ext))) return;
        fs.unlinkSync(path.join(distDir, entry.name));
    });
}

function addDirectoryToZip(zip, sourceDir, baseDir) {
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    entries.forEach((entry) => {
        if (entry.name === '.history') return;
        const absolutePath = path.join(sourceDir, entry.name);
        if (entry.isDirectory()) {
            addDirectoryToZip(zip, absolutePath, baseDir);
            return;
        }
        const relativePath = path.relative(baseDir, absolutePath).replace(/\\/g, '/');
        zip.addFile(relativePath, fs.readFileSync(absolutePath));
    });
}

function createZip(sourceDir, distDir, zipName, projectName) {
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Missing build output directory: ${sourceDir}`);
    }

    ensureDir(distDir);
    removeOldPackages(distDir, projectName);

    const zip = new AdmZip();
    addDirectoryToZip(zip, sourceDir, sourceDir);

    const outputPath = path.join(distDir, zipName);
    zip.writeZip(outputPath);
    return outputPath;
}

function printTree(rootDir) {
    if (!fs.existsSync(rootDir)) {
        console.log(`${path.basename(rootDir)} (missing)`);
        return;
    }

    console.log(path.basename(rootDir));

    function walk(dir, prefix) {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));

        entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            console.log(`${prefix}${connector}${entry.name}`);
            if (entry.isDirectory()) {
                const nextPrefix = prefix + (isLast ? '    ' : '│   ');
                walk(path.join(dir, entry.name), nextPrefix);
            }
        });
    }

    walk(rootDir, '');
}

function buildChrome(version, projectName) {
    console.log('Building Chrome extension...');
    runWebpack('config/webpack.config.js');

    const output = createZip(
        path.join(ROOT_DIR, 'build'),
        path.join(ROOT_DIR, 'dist', 'chrome'),
        `${projectName}-${version}.zip`,
        projectName
    );

    console.log(`✓ Chrome build: ${path.relative(ROOT_DIR, output)}`);
}

function buildFirefox(version, projectName) {
    console.log('Building Firefox extension...');
    runWebpack('config/webpack.firefox.js');

    const output = createZip(
        path.join(ROOT_DIR, 'build-firefox'),
        path.join(ROOT_DIR, 'dist', 'firefox'),
        `${projectName}-${version}.xpi`,
        projectName
    );

    console.log(`✓ Firefox build: ${path.relative(ROOT_DIR, output)}`);
}

function buildCowboyChrome(version, projectName) {
    console.log('Building Cowboy Chrome extension...');
    runWebpack('config/webpack.cowboy.chrome.js');

    const output = createZip(
        path.join(ROOT_DIR, 'build-cowboy', 'chrome'),
        path.join(ROOT_DIR, 'dist', 'cowboy', 'chrome'),
        `${projectName}-cowboy-${version}.zip`,
        projectName
    );

    console.log(`✓ Cowboy Chrome build: ${path.relative(ROOT_DIR, output)}`);
}

function buildCowboyFirefox(version, projectName) {
    console.log('Building Cowboy Firefox extension...');
    runWebpack('config/webpack.cowboy.firefox.js');

    const output = createZip(
        path.join(ROOT_DIR, 'build-cowboy', 'firefox'),
        path.join(ROOT_DIR, 'dist', 'cowboy', 'firefox'),
        `${projectName}-cowboy-${version}.xpi`,
        projectName
    );

    console.log(`✓ Cowboy Firefox build: ${path.relative(ROOT_DIR, output)}`);
}

function main() {
    const isStandardTarget = TARGET === 'chrome' || TARGET === 'firefox' || TARGET === 'all';
    const isCowboyTarget = TARGET === 'cowboy:chrome' || TARGET === 'cowboy:firefox' || TARGET === 'cowboy:all';

    if (isStandardTarget) {
        const manifestTarget = TARGET === 'all' ? 'all' : TARGET;
        runScript(['./tools/generate-manifest.js', manifestTarget]);
    }
    if (isCowboyTarget) {
        const manifestTarget = TARGET === 'cowboy:all' ? 'all' : TARGET.split(':')[1];
        runScript(['./tools/generate-manifest-cowboy.js', manifestTarget]);
    }

    const projectName = path.basename(ROOT_DIR);
    const version = readVersion();

    updateProjectVersions(version);

    if (TARGET === 'chrome' || TARGET === 'all') {
        buildChrome(version, projectName);
    }
    if (TARGET === 'firefox' || TARGET === 'all') {
        buildFirefox(version, projectName);
    }
    if (TARGET === 'cowboy:chrome' || TARGET === 'cowboy:all') {
        buildCowboyChrome(version, projectName);
    }
    if (TARGET === 'cowboy:firefox' || TARGET === 'cowboy:all') {
        buildCowboyFirefox(version, projectName);
    }

    console.log('');
    printTree(path.join(ROOT_DIR, 'dist'));
}

main();
