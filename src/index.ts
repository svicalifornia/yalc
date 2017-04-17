import { exec, execSync } from 'child_process'
import * as fs from 'fs-extra'
import * as path from 'path'
import { copyWithIgnorePackageToStore } from './copy'

const userHome = require('user-home')

export const myNameIs = 'yloc'
export const myNameIsCapitalized = 'Yloc'
export const locedPackagesFolder = '.yloc'
export const lockfileName = 'yloc.lock'


export interface AddPackagesptions {

}

export interface UpdatePackagesptions {
  safe?: boolean
}


export interface PublishPackageOptions {
  knit?: boolean
  force?: boolean
  push?: boolean,
  pushSafe?: boolean
}

export function getPackagesStoreDir(): string {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, myNameIsCapitalized);
  }
  return path.join(userHome, '.' + myNameIs);
}

const getlocPackageDir = (packageName: string, version = '') =>
  path.join(getPackagesStoreDir(), packageName, version)

export interface PackageManifest {
  name: string,
  version: string,
  scripts?: {
    preinstall?: string,
    install?: string,
    prepublish?: string
    postpublish?: string
    preloc?: string
    postloc?: string
  }
}

const getPackageManager = () => execSync('yarn.lock') ? 'yarn' : 'npm'



export const publishPackage = async (options: PublishPackageOptions = {}) => {
  let pkg: PackageManifest
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8')) as PackageManifest;
  } catch (e) {
    console.error('Could not read package.json')
    return
  }
  const scriptRunCmd = !options.force && pkg.scripts
    ? getPackageManager() + ' run ' : ''
  if (scriptRunCmd) {
    if (pkg.scripts!.preloc) {
      execSync(scriptRunCmd + 'preloc')
    } else if (pkg.scripts!.prepublish) {
      execSync(scriptRunCmd + 'prepublish')
    }
  }

  copyWithIgnorePackageToStore(pkg, options.knit)

  if (scriptRunCmd) {
    if (pkg.scripts!.postloc) {
      execSync(scriptRunCmd + 'preloc')
    } else if (pkg.scripts!.postpublish) {
      execSync(scriptRunCmd + 'prepublish')
    }
  }
  if (options.push || options.pushSafe) {
    // To implement
  }
}

const getLatestPackageVersion = (packageName: string) => {
  const dir = getlocPackageDir(packageName)
  const versions = fs.readdirSync(dir)
  const latest = versions.map(version => ({
    version, created: fs.statSync(path.join(dir, version)).ctime.getTime()
  }))
    .sort((a, b) => b.created - a.created).map(x => x.version)[0]
  return latest || ''
}

export const addPackages = (packages: string[], options: PublishPackageOptions = {}) => {
  const packagesStoreDir = getPackagesStoreDir()
  packages.forEach((packageName) => {
    let [name, version = ''] = packageName.split('@')


    if (!version) {
      version = getLatestPackageVersion(name)
    }
    const locPackageDir = getlocPackageDir(name, version)
    if (!fs.existsSync(locPackageDir)) {
      console.log(`Could not find package \`${packageName}\` in ` + packagesStoreDir)
      return
    }

    const pkgFile = path.join(locPackageDir, 'package.json')
    let pkg
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(locPackageDir, 'package.json'), 'utf-8'))
    } catch (e) {
      console.log('Could not read and parse ', pkgFile)
      return
    }

    const destLoctedCopyDir = path.join(process.cwd(),
      locedPackagesFolder, name)
    const destloctedLinkDir = path.join(process.cwd(), 'node_modules', name)
    
    fs.emptyDirSync(destLoctedCopyDir)    
    fs.copySync(locPackageDir, destLoctedCopyDir)
    fs.removeSync(destloctedLinkDir)
    fs.symlinkSync(destLoctedCopyDir, destloctedLinkDir, 'dir')
    console.log(`${pkg.name}@${pkg.version} locted ==> ${destloctedLinkDir}`)
  })
}