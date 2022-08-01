const mysql = require('mysql');
class DataBase 
{
    constructor(setting) 
    {
        this.settingDB = setting;
        this.connection = null;
        this.Start = function() 
        {
            if(this.connection === null) 
            {
                this.connection = mysql.createConnection(this.settingDB);
            }
            else 
            {
                Error('Aby rozpocząć nowe połączenie musisz zakończyć stare');
            }
        }
        this.Stop = function() 
        {
            if(this.connection !== null) 
            {
                this.connection.end();
                this.connection = null;
            }
            else 
            {
                Error('Aby zakończyć połączenie musisz jakieś nawiązać');
            }
        }
        this.Query = function(sql, args) 
        {
            return new Promise((resolve, reject) => 
            {
                this.connection.query(sql, args, function(error, results) 
                {
                    if(error === null) 
                    {
                        resolve( {
                            exit_code: 0,
                            result: results,
                            error: error
                        });
                    }
                    else 
                    {
                        reject(error);
                    }
                });
            });
        }
    }
}

module.exports = DataBase;