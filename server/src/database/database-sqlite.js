import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

const sqlite = sqlite3.verbose()

class SQLiteDatabase {
  /*
  Connects to database and tries to run new migrations
   */
  constructor(dbFile) {
    this.databaseFile = dbFile || './dev_db.sqlite'
    this.db = new sqlite.Database(this.databaseFile)
  }

  async initialize(useTestData) {

    // Foreign keys are by default off...
    this.db.exec('PRAGMA foreign_keys = ON')

    try {
      const newestMigrationId = await this.query('SELECT id FROM migrations ORDER BY id DESC LIMIT 1')
      const newestId = newestMigrationId[0].id
      console.log('Connected to SQLite database at migration', newestId)
      await this.runMigrations(newestId)
    } catch (err) {
      console.log('Could not load migrations, trying to add first migration')
      await this.runMigrations(0)

      if (useTestData) {
        const sqlCommand = fs.readFileSync(path.resolve(__dirname, './test-data.sql')).toString()
        console.log('Loading test data from test-data.sql')
        try {
          await this.exec(sqlCommand)
        } catch (error) {
          console.error('Failed to load test data', error)
        }
      }
    }
  }

  /*
  Gets all migrations from the folder ./migrations and runs all migrations
  that are newer than the parameter newestId, then add them to migrations table in database
   */

  async runMigrations(newestId) {
    const migrations = fs.readdirSync(path.resolve(__dirname, './migrations'))
    migrations.sort()
    for (const file of migrations) {
      const migrNr = parseInt(file.slice(0, 3), 10)
      if (migrNr > newestId) {
        console.log(`Running migration ${file}`)
        const sqlCommand = fs.readFileSync(path.resolve(__dirname, `./migrations/${file}`)).toString()
        await this.exec(sqlCommand).then(() => {
          this.run('INSERT INTO migrations(id, file) VALUES ((?), (?))', [migrNr, file]).catch((err) => {
            console.error(`Failed to add ${file} to migrations table: ${err}`)
          })
        }, (err) => {
          if (err) {
            console.error(`Failed to run migration ${file}`, err)
          }
        })
      }
    }
  }


  /*
  Runs an SQL query in the database. Does not return any value from the database,
  only use for updating or inserting data

  This only runs the first SQL query in the parameter string, to run many queries in the same
  call , use exec instead
   */

  async run(...args) {
    return new Promise((resolve, reject) => {
      this.db.run(...args, (err) => {
        if (err) {
          console.error(`RUNERROR: ${err}`)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
  /*
  Runs an SQL query in the database and returns the result as a promise.
  Use for querying from the database.
   */

  async query(...args) {
    return new Promise((resolve, reject) => {
      this.db.all(...args, (err, res) => {
        if (err) {
          console.error(`QUERYERROR: ${err}`)
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }
  /*
  Runs all SQL queries in the parameter string. Can be used for running migrations
  from a file or other grouped statements in the same string
   */

  async exec(...args) {
    return new Promise((resolve, reject) => {
      this.db.exec(...args, (err) => {
        if (err) {
          console.error(`EXECERROR: ${err}`)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
export default SQLiteDatabase
