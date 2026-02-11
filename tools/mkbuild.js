#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const AdmZip = require('adm-zip');

const ROOT_DIR = process.cwd();
const TARGET = process.argv[2] || 'all';
const VALID_TARGETS = new Set(['chrome', 'firefox', 'all']);

if (!VALID_TARGETS.has(TARGET)) {
    console.error('Usage: node tools/mkbuild.js [chrome|firefox|all]');
    process.exit(1);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readVersion() {
    const candidates = [
        path.join(ROOT_DIR, 'public', 'manifest.json'),
        path.join(ROOT_DIR, 'public-firefox', 'manifest.json')
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            const { version } = readJson(candidate);
            if (version) return version;
        }
    }

    throw new Error('Unable to determine version from manifest.json files.');
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

function runScript(args) {
    execFileSync('node', args, { stdio: 'inherit' });
}

function runWebpack(configPath) {
    runScript(['./node_modules/webpack/bin/webpack.js', '--mode=production', '--config', configPath]);
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function removeOldZips(distDir, projectName) {
    if (!fs.existsSync(distDir)) return;
    const entries = fs.readdirSync(distDir, { withFileTypes: true });
    entries.forEach((entry) => {
        if (!entry.isFile()) return;
        if (!entry.name.startsWith(`${projectName}-`) || !entry.name.endsWith('.zip')) return;
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
    removeOldZips(distDir, projectName);

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
    updatePopupVersion(path.join(ROOT_DIR, 'public', 'popup.html'), version);
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
    updatePopupVersion(path.join(ROOT_DIR, 'public-firefox', 'popup.html'), version);
    runWebpack('config/webpack.firefox.js');

    const output = createZip(
        path.join(ROOT_DIR, 'build-firefox'),
        path.join(ROOT_DIR, 'dist', 'firefox'),
        `${projectName}-${version}.zip`,
        projectName
    );

    console.log(`✓ Firefox build: ${path.relative(ROOT_DIR, output)}`);
}

function main() {
    runScript(['./tools/generate-manifest.js', 'all']);

    const projectName = path.basename(ROOT_DIR);
    const version = readVersion();

    if (TARGET === 'chrome' || TARGET === 'all') {
        buildChrome(version, projectName);
    }
    if (TARGET === 'firefox' || TARGET === 'all') {
        buildFirefox(version, projectName);
    }

    console.log('');
    printTree(path.join(ROOT_DIR, 'dist'));
}

main();
