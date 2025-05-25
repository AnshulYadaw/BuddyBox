#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const Conf = require('conf');
const config = new Conf();

const program = new Command();

// Configure axios defaults
const api = axios.create({
  baseURL: config.get('apiUrl') || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = config.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// IAM Commands
program
  .command('iam')
  .description('Identity and Access Management commands')
  .addCommand(require('./commands/iam'));

// Service Commands
program
  .command('service')
  .description('Service management commands')
  .addCommand(require('./commands/service'));

// Config Commands
program
  .command('config')
  .description('Configuration commands')
  .addCommand(require('./commands/config'));

// Version
program.version('1.0.0');

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 