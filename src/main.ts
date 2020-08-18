#! /usr/local/bin/ts-node
import { cwd, chdir } from 'process'
import { execSync, ExecSyncOptions} from 'child_process'
import path from 'path'
import { Command, createCommand} from 'commander'
import {bind as trimCommand} from './trim'
import {bind as upgradeCommand} from './upgrade'
const program = createCommand();

program.version('0.0.1')
trimCommand(program)
upgradeCommand(program)
program.parse()

