const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const Conf = require('conf');
const config = new Conf();

const program = new Command('iam');

// Register command
program
  .command('register')
  .description('Register a new user')
  .option('-e, --email <email>', 'User email')
  .option('-p, --password <password>', 'User password')
  .option('-n, --name <name>', 'User name')
  .option('-r, --role <role>', 'User role (user/admin/superadmin)')
  .action(async (options) => {
    const spinner = ora('Registering user...').start();

    try {
      // Prompt for missing information
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          when: !options.email,
          validate: input => /^\S+@\S+\.\S+$/.test(input) || 'Please enter a valid email'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          when: !options.password,
          validate: input => input.length >= 8 || 'Password must be at least 8 characters'
        },
        {
          type: 'input',
          name: 'name',
          message: 'Name:',
          when: !options.name
        },
        {
          type: 'list',
          name: 'role',
          message: 'Role:',
          choices: ['user', 'admin', 'superadmin'],
          when: !options.role
        }
      ]);

      const userData = {
        email: options.email || answers.email,
        password: options.password || answers.password,
        name: options.name || answers.name,
        role: options.role || answers.role
      };

      const response = await axios.post('/iam/register', userData);
      
      spinner.succeed(chalk.green('User registered successfully'));
      console.log(chalk.blue('\nUser details:'));
      console.log(JSON.stringify(response.data.data.user, null, 2));
    } catch (error) {
      spinner.fail(chalk.red('Failed to register user'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Login command
program
  .command('login')
  .description('Login to BuddyBox')
  .option('-e, --email <email>', 'User email')
  .option('-p, --password <password>', 'User password')
  .action(async (options) => {
    const spinner = ora('Logging in...').start();

    try {
      // Prompt for missing information
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Email:',
          when: !options.email,
          validate: input => /^\S+@\S+\.\S+$/.test(input) || 'Please enter a valid email'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          when: !options.password
        }
      ]);

      const loginData = {
        email: options.email || answers.email,
        password: options.password || answers.password
      };

      const response = await axios.post('/iam/login', loginData);
      
      // Save token and user info
      config.set('token', response.data.data.tokens.accessToken);
      config.set('refreshToken', response.data.data.tokens.refreshToken);
      config.set('user', response.data.data.user);

      spinner.succeed(chalk.green('Logged in successfully'));
      console.log(chalk.blue('\nWelcome, ') + chalk.green(response.data.data.user.name));
    } catch (error) {
      spinner.fail(chalk.red('Login failed'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Logout command
program
  .command('logout')
  .description('Logout from BuddyBox')
  .action(async () => {
    const spinner = ora('Logging out...').start();

    try {
      if (config.get('token')) {
        await axios.post('/iam/logout');
      }

      // Clear stored data
      config.delete('token');
      config.delete('refreshToken');
      config.delete('user');

      spinner.succeed(chalk.green('Logged out successfully'));
    } catch (error) {
      spinner.fail(chalk.red('Logout failed'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// List users command
program
  .command('list')
  .description('List all users (admin only)')
  .action(async () => {
    const spinner = ora('Fetching users...').start();

    try {
      const response = await axios.get('/iam/users');
      
      spinner.succeed(chalk.green('Users fetched successfully'));
      console.log(chalk.blue('\nUsers:'));
      response.data.data.users.forEach(user => {
        console.log(chalk.yellow(`\nID: ${user._id}`));
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Last Login: ${user.lastLogin || 'Never'}`);
      });
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch users'));
      console.error(error.response?.data?.message || error.message);
    }
  });

// Delete user command
program
  .command('delete')
  .description('Delete a user (admin only)')
  .argument('<id>', 'User ID to delete')
  .action(async (id) => {
    const spinner = ora('Deleting user...').start();

    try {
      await axios.delete(`/iam/users/${id}`);
      
      spinner.succeed(chalk.green('User deleted successfully'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to delete user'));
      console.error(error.response?.data?.message || error.message);
    }
  });

module.exports = program; 