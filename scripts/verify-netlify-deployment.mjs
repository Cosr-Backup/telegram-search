#!/usr/bin/env node
/**
 * Verification script for Netlify deployment
 * This script verifies that:
 * 1. The frontend build is successful
 * 2. Required files are present in the build output
 * 3. Environment variables are set correctly
 * 4. Functions are structured correctly
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  }
  
  const prefix = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warning: '⚠'
  }
  
  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`)
}

function checkBuildOutput() {
  log('Checking frontend build output...', 'info')
  
  const distDir = join(rootDir, 'apps/web/dist')
  
  if (!existsSync(distDir)) {
    log('Build output directory not found', 'error')
    return false
  }
  
  log('Build output directory exists', 'success')
  
  // Check for index.html
  const indexPath = join(distDir, 'index.html')
  if (!existsSync(indexPath)) {
    log('index.html not found', 'error')
    return false
  }
  log('index.html found', 'success')
  
  // Check for assets directory
  const assetsDir = join(distDir, 'assets')
  if (!existsSync(assetsDir)) {
    log('assets directory not found', 'error')
    return false
  }
  log('assets directory found', 'success')
  
  // Check build size
  const files = getAllFiles(distDir)
  const totalSize = files.reduce((acc, file) => {
    const stats = statSync(file)
    return acc + stats.size
  }, 0)
  
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2)
  log(`Total build size: ${sizeMB} MB`, 'info')
  
  // Check for PGlite files (browser-only mode)
  const hasPglite = files.some(file => file.includes('pglite'))
  if (hasPglite) {
    log('PGlite files found (browser-only mode enabled)', 'success')
  } else {
    log('PGlite files not found', 'warning')
  }
  
  return true
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath)
  
  files.forEach(file => {
    const filePath = join(dirPath, file)
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles)
    } else {
      arrayOfFiles.push(filePath)
    }
  })
  
  return arrayOfFiles
}

function checkNetlifyConfig() {
  log('Checking Netlify configuration...', 'info')
  
  const netlifyTomlPath = join(rootDir, 'netlify.toml')
  
  if (!existsSync(netlifyTomlPath)) {
    log('netlify.toml not found', 'error')
    return false
  }
  
  log('netlify.toml found', 'success')
  
  const content = readFileSync(netlifyTomlPath, 'utf-8')
  
  // Check for required configuration
  const checks = [
    { key: 'publish', description: 'publish directory' },
    { key: 'functions', description: 'functions directory' },
    { key: 'VITE_WITH_CORE', description: 'browser-only mode flag' },
    { key: 'NODE_VERSION', description: 'Node.js version' },
    { key: 'PNPM_VERSION', description: 'pnpm version' },
    { key: 'base = "."', description: 'base directory (root)' },
    { key: 'node_bundler', description: 'functions node bundler' },
  ]
  
  let allChecked = true
  checks.forEach(check => {
    if (content.includes(check.key)) {
      log(`${check.description} configured`, 'success')
    } else {
      log(`${check.description} not configured`, 'error')
      allChecked = false
    }
  })
  
  return allChecked
}

function checkFunctions() {
  log('Checking Netlify Functions...', 'info')
  
  const functionsDir = join(rootDir, 'netlify/functions')
  
  if (!existsSync(functionsDir)) {
    log('Functions directory not found', 'error')
    return false
  }
  
  log('Functions directory exists', 'success')
  
  // Check for required function files
  const requiredFunctions = ['server.ts', 'ws.ts']
  let allFunctionsExist = true
  
  requiredFunctions.forEach(func => {
    const funcPath = join(functionsDir, func)
    if (existsSync(funcPath)) {
      log(`${func} found`, 'success')
    } else {
      log(`${func} not found`, 'error')
      allFunctionsExist = false
    }
  })
  
  // Check for package.json - should NOT exist (we use root dependencies)
  const packageJsonPath = join(functionsDir, 'package.json')
  if (existsSync(packageJsonPath)) {
    log('Functions package.json found (should be removed for Netlify deployment)', 'warning')
  } else {
    log('Functions package.json correctly removed (uses root dependencies)', 'success')
  }
  
  return allFunctionsExist
}

function checkEnvironment() {
  log('Checking environment configuration...', 'info')
  
  const envNetlifyPath = join(rootDir, '.env.netlify')
  
  if (!existsSync(envNetlifyPath)) {
    log('.env.netlify not found', 'warning')
    log('Using default environment variables', 'info')
  } else {
    log('.env.netlify found', 'success')
    
    const content = readFileSync(envNetlifyPath, 'utf-8')
    
    const requiredVars = [
      'VITE_TELEGRAM_APP_ID',
      'VITE_TELEGRAM_APP_HASH',
      'VITE_WITH_CORE'
    ]
    
    requiredVars.forEach(varName => {
      if (content.includes(varName)) {
        log(`${varName} configured`, 'success')
      } else {
        log(`${varName} not configured`, 'warning')
      }
    })
  }
  
  return true
}

function main() {
  console.log('\n=== Netlify Deployment Verification ===\n')
  
  const checks = [
    { name: 'Build Output', fn: checkBuildOutput },
    { name: 'Netlify Config', fn: checkNetlifyConfig },
    { name: 'Functions', fn: checkFunctions },
    { name: 'Environment', fn: checkEnvironment }
  ]
  
  let allPassed = true
  
  checks.forEach(check => {
    console.log(`\n--- ${check.name} ---\n`)
    const result = check.fn()
    if (!result) {
      allPassed = false
    }
  })
  
  console.log('\n=== Verification Complete ===\n')
  
  if (allPassed) {
    log('All checks passed! Ready for Netlify deployment.', 'success')
    process.exit(0)
  } else {
    log('Some checks failed. Please review the errors above.', 'error')
    process.exit(1)
  }
}

main()
