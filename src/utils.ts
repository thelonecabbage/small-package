#! /usr/local/bin/ts-node
import { exit } from 'process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

export interface Dictionary<type> {
    [key: string]: type;
}
export interface PackageJson {
    scripts: Dictionary<string>;
    dependencies: Dictionary<string>;
    devDependencies: Dictionary<string>;
}

export function newGit(path:string):SimpleGit {
    const options: SimpleGitOptions = {
        baseDir: path || process.cwd(),
        binary: 'git',
        maxConcurrentProcesses: 6,
     };
    const git: SimpleGit = simpleGit(options);
    return git 
}

export async function testPathValid(path:string) {
    if (!existsSync(path)) {
        console.error(`ERROR: path "${path}" does not exist`)
        exit(1)
    }
    if (!existsSync(`${path}/package.json`)) {
        console.error(`ERROR: "${path}/package.json" does not exist`)
        exit(1)
    }

    const git = newGit(path)
    const gitStatus = await git.status()
    const gitChangeCount = gitStatus.files.length - gitStatus.not_added.length
    if (gitChangeCount) {
        console.error(`ERROR: git has ${gitChangeCount} uncommitted changes`)
        exit(1)
    }
}

export function loadJSON(fname:string):object {
    const raw = readFileSync(fname, 'utf8')
    return JSON.parse(raw)
}
export function saveJSON(fname:string, data:object) {
    const buffer = JSON.stringify(data, null, 2)
    writeFileSync(fname, buffer)
}

export function deepClone(data:object):object {
    return JSON.parse(JSON.stringify(data))
}