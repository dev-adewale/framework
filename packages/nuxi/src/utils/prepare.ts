import { promises as fsp } from 'fs'
import { relative, resolve } from 'pathe'
import { cyan } from 'colorette'
import { Nuxt, TSReference } from '@nuxt/kit'
import consola from 'consola'
import { getModulePaths, getNearestPackage } from './cjs'

export const writeTypes = async (nuxt: Nuxt) => {
  const modulePaths = getModulePaths(nuxt.options.modulesDir)
  const rootDir = nuxt.options.rootDir

  const references: TSReference[] = [
    ...nuxt.options.buildModules,
    ...nuxt.options.modules,
    ...nuxt.options._modules
  ]
    .filter(f => typeof f === 'string')
    .map(id => ({ types: getNearestPackage(id, modulePaths)?.name || id }))

  const declarations: string[] = []

  await nuxt.callHook('builder:generateApp')
  await nuxt.callHook('prepare:types', { references, declarations })

  const declarationPath = resolve(`${rootDir}/nuxt.d.ts`)

  const declaration = [
    '// This file is auto generated by `nuxt prepare`',
    '// Please do not manually modify this file.',
    '',
    ...references.map((ref) => {
      if ('path' in ref) {
        ref.path = relative(rootDir, ref.path)
      }
      return `/// <reference ${renderAttrs(ref)} />`
    }),
    ...declarations,
    'export {}',
    ''
  ].join('\n')

  await fsp.writeFile(declarationPath, declaration)

  consola.success('Generated', cyan(relative(process.cwd(), declarationPath)))
}

function renderAttrs (obj: Record<string, string>) {
  return Object.entries(obj).map(e => renderAttr(e[0], e[1])).join(' ')
}

function renderAttr (key: string, value: string) {
  return value ? `${key}="${value}"` : ''
}