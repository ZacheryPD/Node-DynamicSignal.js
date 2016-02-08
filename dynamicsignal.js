//var curling = require('curling');

/**
 * @author Zachery DeLong https://github.com/ZacheryPD
 * @version 1.1.0
 * 
 * overview:
 *   This is a module designed to make administering a Dynamic Signal instance
 *   easier by offering local JS based bindings for the API documented at
 *   dev.voicestorm.com
 *
 * Method breakdown
 * => todo
*/
var http = require('./HTTPRequest.js');
module.exports = {
    debugging: false,
    affiliations: Array(),
    SuccesfulUpdates: Array(),
    UnsuccesfulUpdates: Array(),
    urls: {
        base_url: "",
        register: "/v1/register/",
        whitelist: "/v1/whitelist/add/",
        user: "/v1/user/",
        users: "/v1/users",
        getAffiliations: "/v1/affiliations",
        getAffiliationsByUser: "/v1/manage/user/{id}/affiliations",
        resetPassword: "/v1/login/forgotpassword",
        inviteUser: "/v1/invite"
    },
    tokens: {
        bearer: ""
    },
    setBaseUrl: function(base) {
        this.urls["base_url"] = base;
        return true;
    },
    setBearerToken: function(token) {
        this.tokens["bearer"] = token;
    },
    isReady: function() {
        if (this.tokens["bearer"] != "" && this.urls["base_url"] != "") {
            return true;
        }
    },
    processApiErrors: function(foo) {
        console.log('The server was reached, but could not respond.');
        if (foo.messages != null) {
            console.info(foo);
            console.log("We found more detail(s)!");
            for (var i = 0; i < foo.messages.length; i++) {
                console.log('\t' + foo.messages[i]);
            }
        } else {
            console.log("This is a dump of the information returned");
            console.info(foo);
        }
    },
    whitelistUsers: function(users, callback) {
        var self = this;
        if (!this.isReady()) {
            throw new Exception("Ensure your token and url are set correctly!");
        }
        //Call into Dynamic Signal REST API, post assembled list of emaisl.
        //console.log("Whitelisting users");
        var data = {};
        data.emails = Array();
        for (var i=0; i< users.length; i++)
        {
            data.emails.push(users[i].email);
        }

        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["whitelist"],
            contentType: 'application/json',
            authorization: self.tokens.bearer,
            method: "PUT",
            data: data
        }

        http.request(httpConfig, function(result){
            if (this.debugging) {
                console.log("in callback from whitelist request.");
                console.log(result);
            }

            if (result.code != "success") {
                if(self.debugging){
                    console.log("The request to whitelist was not succesful.");
                    console.info(result);
                }

                self.processApiErrors((result.data == null) ? payload : result);
            } else {
                //self.inviteUsers(users, callback);
                //console.log("Whitelist succesful");
                callback(users);
            }
        });
    },

    registerUsers: function(users, callback) {
        var self = this;
        var user = users.pop();
        //Ensure that the object has been set up correctly thus far.
        if (this.debugging) {
            console.log("*** Starting import of new user ***");
        }
        else{
            console.log(" . ");
        }

        if (!this.isReady()) {
            throw new SetupError(this.urls, this.tokens);
        }

        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["register"],
            contentType: 'application/json',
            authorization: self.tokens.bearer,
            method: "PUT",
            data: user
        }
        http.request(httpConfig, function(payload){
            console.log("In callback from http request.");
            //user.password = "";
            if (self.debugging) {
                console.log("*** Finished requested to insert a user. ***");
                console.info(payload);
            }

            //If the user was inserted succesfully...
            if ("user" in payload) {
                user.id = payload.user.id;

                self.adjustDivisionsOnUser(payload.user.id, user.divisions, function() {
                    if (self.debugging) {
                        console.log("*** Succesfully adjusted divisions on user: " + user.email + " ***");
                    }

                    //New, non-password reset flow.
                    self.SuccesfulUpdates.push(user);
                    //We need to reset the user's password before doing any of the below
                    //Check to see if there are more users to be imported...
                    if (users.length > 0) {

                        self.registerUsers(users, callback);
                    } else {
                        //There are no more users to insert

                        callback(self.SuccesfulUpdates, self.UnsuccesfulUpdates);
                    }
                    //End new non-password reset flow
                });
            } else {
                //There was a problem inserting the user.
                user.ErrorCode = "There was a problem inserting this user.";
                user.ErrorObject = payload;
                self.UnsuccesfulUpdates.push(user);

                if (self.debugging) {
                    console.info(self.UnsuccesfulUpdates);
                }

                if (users.length > 0) {
                    self.registerUsers(users, callback);
                } else {
                    callback(self.SuccesfulUpdates, self.UnsuccesfulUpdates);
                }
            }
        });
    },
    whitelistAndRegisterUsers: function(users, callback) {
        //Playing with scope because what does it matter anyway.
        var self = this;

        this.batchWhiteListUsers(users, function(users){
            //console.log("Registering users.");
            self.registerUsers(users, callback);
        });
    },
    adjustDivisionsOnUser: function(userId, divisions, success) {
        if (!this.isReady()) {
            throw new Exception("Ensure your urls and tokens are set up correctly!");
        }

        var self = this;
        var str = {
            divisions: divisions
        };


        if (this.debugging) {
            console.log("\nIn the adjustDivisionsOnUser() function.\nHere are the setup objects currently:");
            console.info(this.tokens);
            console.info(this.urls);

            console.log("String of json.");
            console.log(str);
            console.log("Bytelenfth of string.");
            console.log(Buffer.byteLength(str));
        }
        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["user"] + userId,
            contentType: 'application/json',
            authorization: self.tokens["bearer"],
            method: "PUT",
            data: (str)
        }
        http.request(httpConfig, function(response){
            if (self.debugging) {
                console.log("User updated.");
                console.log("\n");
                console.info(response);
            }

            if (response.divisions != null && response.divisions.length > 0) {
                success();
            }
            else
            {
                console.log(userId + " was unsuccesfully updated.  Quiting.");
            }
        });

    },
    getUsers: function(ids, callback) {

        if (!this.isReady()) {
            throw new SetupError(self.urls, self.tokens);
        } else if (!(ids instanceof Array)) {
            throw "The ids passed to the getUsers function must be arrays";
        }

        //The web standard for passing arrays through GET is terrible.  if this fails, try ids[]=.
        //http://stackoverflow.com/questions/6243051/how-to-pass-an-array-within-a-query-string
        var string = ids.join("&ids=");
        string = "?ids=" + string;
        var self = this;

        if (this.debugging) {
            console.log("In the getUsers() function.\nHere are the setup objects currently:");
            console.info(this.tokens);
            console.info(this.urls);
            console.log("Here are the ids you put together!");
            console.log(string);
        }
        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["users"] + string,
            contentType: 'application/json',
            authorization: self.tokens["bearer"],
            method: "GET",
        }

        http.request(httpConfig, function(response){
            callback(response);
        });
    },
    getAffiliations: function(success) {
        //Get and store affiliations on this workspace.
        var self = this;
        if (!this.isReady()) {
            throw new SetupError(this.urls, this.tokens);
        }
        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["getAffiliations"],
            contentType: 'application/json',
            authorization: self.tokens["bearer"],
            method: "GET",
        }

        http.request(httpConfig, function(response){
            if (self.debugging) {
                console.log("The response object from Dynamic Signal's servers.");
                console.info(response);
            }

            var affiliations = Array();
            for (var item in response.affiliations) {

                item = response.affiliations[item];

                if (self.debugging) {
                    console.log("The item being added to our local storage.");
                    console.info(item);
                }
                var question = {
                    question: new Question(item.question.questionId, item.question.name, item.question.scorePosition, item.question.description, item.question.questionType, item.question.required, item.question.isPubliclyVisible),
                    answers: Array()
                };

                for (var answer in item.answers) {
                    answer = item.answers[answer];
                    question.answers.push(new Answer(answer.answerId, answer.answer, answer.declineToAnswer, answer.position));
                }

                affiliations.push(question);
            }

            var values = new Questions(affiliations);

            //console.log("searching...");
            //console.info(values.findQuestion("Please choose your content interests"));


            success(values);
        });

    },
    getUserAffiliations: function(user, callback) {
        var self = this;
        if (!this.isReady()) {
            throw new SetupError(this.urls, this.tokens);
        }

        if (this.debugging) {
            console.log("Current self:");
            console.info(self);
        }

        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["getAffiliationsByUser"].replace("{id}", user),
            contentType: 'application/json',
            authorization: self.tokens["bearer"],
            method: "GET",
        }

        http.request(httpConfig, function(response){
            callback(response);
        });
    },
    resetPassword: function(userEmail, callback) {
        var self = this;
        if (!this.isReady()) {
            throw new SetupError(this.urls, this.tokens);
        }

        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["resetPassword"],
            contentType: 'application/json',
            authorization: self.tokens["bearer"],
            method: "PUT",
            data: ({email: userEmail})
        }

        http.request(httpConfig, function(response){
            if (self.debugging) {
                console.log("The response from the call to reset passwords.");
                console.info(response);
            }
            callback(response);

        });

    },

    batchWhiteListUsers: function(users, callback){
        var self = this;
        /* A simple method that accepts a list of users and invites
         * them individuall instead of as a group.
         * This is useful for large groups of users that need to
         * be uploaded at once.  
         *
         * The downside is that this will make a large number of requests
         */

        if(users instanceof Array)
        {
            //Copy by VALUE not reference
            var usersSubset = users.slice(0);
            //console.info(usersSubset);
            if(usersSubset.length >= 200)
            {
                self.whitelistUsers(userSubset.slice(0, 199), function(u){

                    self.whiteListUsers(userSubset, callback);
                });
            }
            else
            {
                self.whitelistUsers(users, function(u){
                    callback(users);
                });
            }
        }
    }

    adjustUser: function(user, callback){
        var self=this;
        if (!this.isReady()) {
            throw new Exception("Ensure your token and url are set correctly!");
        }

        var httpConfig = {
            host: self.urls["base_url"],
            relativeURL: self.urls["user"] + userId,
            contentType: 'application/json',
            authorization: self.tokens["bearer"],
            method: "PUT",
            data: JSON.parse(str)
        }
        http.request(httpConfig, function(response){
            if(self.debugging){
                console.log( 'The response from adjustUser' );
                console.info( response );
            }
            callback(response);
        });
    }
}

function SetupError(urls, tokens) {
    this.message = "There was a problem with the urls/tokens given.";
    this.urls = urls.join();
    this.tokens = tokens.join();
}

function Question(questionId, name, scorePosition, description, questionType, isPubliclyVisible) {
    this.questionId = questionId;
    this.name = name;
    this.scorePosition = scorePosition;
    this.description = description;
    this.questionType = questionType;
    this.isPubliclyVisible = isPubliclyVisible;
}

Question.prototype.clone = function() {
    return new Question(this.questionId, this.name, this.scorePosition, this.description, this.questionType, this.isPubliclyVisible);
};

function Answer(id, answer, declineToAnswer, position) {
    this.answerId = id;
    this.answer = answer;
    this.declineToAnswer = declineToAnswer;
    this.position = position;
};
Answer.prototype.clone = function() {
    return new Answer(this.answerId, this.answer, this.declineToAnswer, this.position);
};

function Questions(affiliations) {
    this.affiliations = affiliations;
}

Questions.prototype.FindQuestion = function(question) {
    //If the questions array is unset, throw an error.
    if (this.affiliations.length < 1) {
        throw "The affiliations array must be populated before it can be searched.";
    }

    //If the questions array is set, loop through each 
    //item, checking the question name for the given question.
    for (var index in this.affiliations) {
        var item = this.affiliations[index];

        //if(String(item.question.name).indexOf(question) > -1){
        if (String(item.question.name) == String(question)) {
            return item.question.clone();
        }
    }

    //If we get this far, we weren't able to find the given question...
    return null;
    };
    Questions.prototype.FindAnswer = function(answer) {
        //If the questions array is unset, throw an error.

        //This is a bit more complex.  We need to search all answers in each question
        for (var i in this.affiliations) {
            for (var j in this.affiliations[i].answers) {
                var item = this.affiliations[i].answers[j];

                if (String(item.answer) == answer) {
                    return item.clone();
                }
            }
        }

        //If we get this far, we couldn't find the answer
        return null;
    };
