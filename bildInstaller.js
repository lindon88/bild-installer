#!/usr/bin/env node

/**
 * File name: index.js
 * Author: Lindon Camaj
 * Date: 6/14/2016
 * Copyright (c) 2015 Bild Studio
 * http://www.bild-studio.com
 */

var fs = require("fs");
var inquirer = require("inquirer");
var prompt = inquirer.createPromptModule();
var runAsync = require("run-async");
var async = require("async");
var cmd = require("node-cmd");
var _ = require("underscore");
var colors = require("colors");
var path = require("path");

var config = {
    file: "",
    path: "",
    ext: ""
};

/**
 * Installer function
 * @param err
 * @param options
 */
var installer = function(err, options){

    this.cwd = config.path;
    this.credentials = null;
    this.apps = null;
    this.iterator = 0;

    /**
     * Initialize installer application
     * @param options
     */
    this.run = function(options){
        var self = this;
        if(this.checkOptions(options)){
            this.apps = this.readJsonConfiguration();
            if(!_.isUndefined(this.apps) && !_.isNaN(this.apps) && _.isArray(this.apps)){
                this.installApplicationsConfirm(function(){
                    var done = this.async();

                    // define application list
                    var appList = [];
                    _.each(self.apps, function(app){
                        appList.push({
                            name: app.name,
                            checked: false
                        });
                    });

                    var questions = [
                        {
                            type: 'checkbox',
                            name: 'selectedApps',
                            message: 'Select applications to install: ',
                            choices: appList
                        }
                    ];

                    prompt(questions).then(function (answers) {
                        done(null, answers);
                    });

                }, this.installApplications);
            }
        }
    };

    /**
     * Install applications confirm
     * @param func
     * @param runFunc
     */
    this.installApplicationsConfirm = function(func, runFunc){
        runAsync(func, runFunc)();
    };

    /**
     * Install selected applications applications
     * @param err
     * @param sApps
     */
    this.installApplications = function(err, sApps){
        try{
            var self = this;
            if(!_.isUndefined(sApps) && !_.isNull(sApps) && !_.isUndefined(sApps.selectedApps) && _.isArray(sApps.selectedApps)){
                var selectedApps = sApps.selectedApps;

                if(_.isArray(selectedApps) && !_.isUndefined(selectedApps[this.iterator])){
                    var selectedApp = selectedApps[this.iterator];
                    var installationApp = null;

                    _.each(this.apps, function(app){
                        if(app.name == selectedApp){
                            installationApp = app;
                        }
                    });

                    self.installApplication(installationApp, function(status){
                        if(status == true){
                            console.log(colors.green("Application " + installationApp.name + " successfully installed!"));
                        }
                        else{
                            console.log(colors.red("Application " + installationApp.name + " is not installed!"));
                        }

                        self.iterator++;
                        self.installApplications(null, sApps);
                    });
                }

                /*
                _.each(selectedApps, function(item){
                    var i = 0; var current = 0;
                    while(i < self.apps.length){
                        var app = self.apps[i];
                        if(!_.isUndefined(app) && !_.isUndefined(app.name) && app.name == item){
                            if(i == current){
                                current++;
                                self.installApplication(app, function(status){
                                    if(status == true){
                                        console.log(colors.green("Application " + app.name + " successfully installed!"));
                                    }
                                    else{
                                        console.log(colors.red("Application " + app.name + " is not installed!"));
                                    }
                                    i++;
                                });
                            }
                        }
                        else{
                            i++;
                        }
                    }
                });
                */
            }
        }
        catch(exception){
            console.log(colors.red(exception));
        }
    };

    /**
     * Install application
     * @param application
     * @returns {boolean}
     */
    this.installApplication = function(application, callback){
        try{
            if(!_.isUndefined(this.cwd) && this.cwd != "" && !_.isUndefined(application)) {

                console.log("Installing application: " + application.name);

                var mainPath = this.cwd;
                var dPath = null;

                if (!_.isUndefined(application.parentPath) && application.parentPath != "" && application.parentPath != ".") {
                    mainPath = this.cwd + "\\" + application.parentPath;
                    if (!fs.existsSync(mainPath)) {
                        fs.mkdirSync(mainPath);
                    }
                }

                if (!_.isUndefined(application.downloadPath) && application.downloadPath != "") {
                    dPath = mainPath + "\\" + application.downloadPath;
                    if(fs.existsSync(dPath)){
                        console.log(colors.blue("Application exists!!!"));
                        // notify that application not installed
                        callback(false);
                        return false;
                    }

                    if(!_.isUndefined(application.git) && !_.isUndefined(application.git.https)){
                        cmd.get("cd " + mainPath + " && git clone " + application.git.https + " " + application.downloadPath, function(data){
                            if(!_.isUndefined(application.git.branch)){
                                cmd.get("cd " + dPath + " && git fetch && git checkout " + application.git.branch, function(dd){
                                    // notify that application is installed!!
                                    callback(true);
                                });
                            }
                            else{
                                // notify that application is installed!!
                                callback(true);
                            }
                        });
                        return true;
                    }
                    else{
                        // notify that application not installed
                        callback(false);
                        return false;
                    }
                }
                else {
                    console.log(colors.red("Download path is not defined!!!"));
                    // notify that application not installed
                    callback(false);
                    return false;
                }
            }
            // notify that application not installed
            callback(false);
            return false;
        }
        catch(exception){
            console.log(colors.red(exception));
        }
    };

    /**
     * Read json configuration
     * @returns {*}
     */
    this.readJsonConfiguration = function(){
        try{
            var appsString = fs.readFileSync(config.file, "utf8");
            var compile = _.template(appsString);
            return JSON.parse(compile(this.credentials));
        }
        catch(exception){
            console.log(exception);
        }
    };

    /**
     * Check options if user and password are set
     * @param options
     * @returns {boolean}
     */
    this.checkOptions = function(options){
        if(!_.isUndefined(options) && !_.isNull(options)){
            if(!_.isUndefined(options.gitUser) && !_.isNull(options.gitUser) && options.gitUser != ""
                && !_.isUndefined(options.gitPassword) && !_.isNull(options.gitPassword) && options.gitPassword != ""){
                this.credentials = {
                    user: options.gitUser,
                    password: options.gitPassword
                };
/*
                if(!_.isUndefined(options.cwd) && !_.isNull(options.cwd) && options.cwd != ""){
                    this.cwd = options.cwd;
                }
*/
                return true;
            }
        }

        return false;
    };

    /**
     * Run installer
     */
    this.run(options);
};

/**
 * Initialize application
 * Get params form console (input)
 * @param func
 * @param runFunc
 */
var initializeApplication = function(func, runFunc){
    runAsync(func, runFunc)();
};

if(!_.isUndefined(process.argv) && process.argv.length == 3){
    if(!_.isUndefined(process.argv[2])){
        config.file = process.argv[2];
        config.path = path.dirname(config.file);
        config.ext = path.extname(config.file);
        if(config.ext == ".json"){
            // start application
            initializeApplication(function(){
                console.log("Insert bitbucket user name and password to continue with installation!");
                var done = this.async();

                var questions = [
                    {
                        type: "input",
                        name: "gitUser",
                        message: "Git username: "
                    },
                    {
                        type: "password",
                        name: "gitPassword",
                        message: "Git password: "
                    }
                ];

                prompt(questions).then(function (answers) {
                    done(null, answers);
                });

            }, installer);
        }
        else{
            console.log("File is not correct!!!");
        }
    }
}