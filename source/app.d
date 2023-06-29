import vibe.vibe;

import std.process;
import std.file;
import std.algorithm;
import std.array;
import std.conv : to;




struct Review{
    @name("_id") BsonObjectID id;
    string reviewer, review;
}

struct Reviewee {
    @name("_id") BsonObjectID id;
    string name_;
    Review[] reviews;
}


interface restAPI {
    @safe:
    void postNewReview(string review, string reviewer, string reviewee);
    void postDeleteReview(string reviewee, BsonObjectID id);
    Review[] getReviews(string reviewee);
    ulong getReviewCount(string reviewer);
}

class restImpl : restAPI {

    private MongoCollection _reviews;

    this(MongoCollection reviews){
        _reviews = reviews;
    }

public:
@safe:
    void postNewReview(string review, string reviewer, string reviewee){
        logInfo("got post review " ~ review ~ " " ~ reviewer ~ " " ~ reviewee);
        Review ins = Review(BsonObjectID.generate(), reviewer, review);
        auto options = UpdateOptions();
        options.upsert = true;
        _reviews.updateOne(["name" : reviewee], ["$push" : ["reviews" : ins]], options);
        logInfo("updated collection, I think");
        foreach(doc; _reviews.find){
            logInfo(doc.toString());
        }
    }

    Review[] getReviews(string reviewee){
        logInfo("got reviews request for " ~ reviewee);
        auto revieweeObj = _reviews.findOne!Reviewee(["name": reviewee]);
        auto ret = revieweeObj.isNull ? [] : revieweeObj.get.reviews;
        logInfo("returning " ~ to!string(ret));
        return ret;
    }

    void postDeleteReview(string reviewee, BsonObjectID id){
        logInfo("got delete request for %s, %s", reviewee, to!string(id));
        _reviews.updateOne(["name": reviewee],
                        ["$pull": ["reviews":  ["_id": id]]]);
    }

    ulong getReviewCount(string reviewer){
        logInfo("got getReviewCount request for " ~ reviewer);
        const ret = _reviews.count(["reviews" : [ "$elemMatch" : [ "reviewer" : reviewer ] ] ]);
        return ret;
    }

}


void main(string[] args)
{
    logInfo(getcwd());

    auto assignmentInfoFilename =
        readRequiredOption!string("assignmentInfo",
                                  "JSON file with the fields for `assignmentName` and `roster`");

    auto pid = spawnProcess(["mongod", /* "/opt/homebrew/opt/mongodb-community@4.4/bin/mongod",*/ //use the old version because vibeD wireprotocol still uses opUpdate
                             "--dbpath", "./databases"]);

    sleep(dur!("msecs")(2000));

    scope(exit){
        logInfo("sending sigterm to %s", pid.processID);
        kill(pid);
    }



    auto assignmentInfoJson = parseJsonString(readText(assignmentInfoFilename), assignmentInfoFilename);
    //logInfo(assignmentInfoJson.toPrettyString);

    string assignmentName = assignmentInfoJson["assignmentName"].get!string;

    auto students = assignmentInfoJson["roster"].byValue.filter!(x => x["role"].get!string == "Student").array;
    logInfo("students: ");
    foreach(student; students){
        logInfo(student.toPrettyString);
    }
    string instructor;
    if("instructor" in assignmentInfoJson){
        instructor = assignmentInfoJson["instructor"].get!string;
    }

    logInfo("trying to connect");
    MongoClient client = connectMongoDB("127.0.0.1");
    logInfo("connected");
    auto db = client.getDatabase("reviews");

    MongoCollection reviews = db[assignmentName];
    //reviews.insert(["name" : "nobody", "reviews" : []]);
    logInfo("reviews collection name: " ~ reviews.name);
    /*foreach(_db; client.getDatabases){
        logInfo("DBS: " ~ _db.name);
        }*/

	auto settings = new HTTPServerSettings;
	settings.port = 8080;
	settings.bindAddresses = ["::1", "127.0.0.1"];
    settings.accessLogToConsole = true;


    auto router = new URLRouter;
    router.get("/", (req, res){
            logInfo("calling serveIndex");
            res.render!("index.dt", assignmentName, students, instructor);
        });
    router.registerRestInterface(new restImpl(reviews));
    router.get("*", serveStaticFiles("./public"));

    foreach(k, v; router.getAllRoutes){
        logInfo("route: " ~ k.to!string ~ " -> " ~ v.to!string);
    }

	auto listener = listenHTTP(settings, router);
	scope (exit)
	{
		listener.stopListening();
	}

	logInfo("Please open http://127.0.0.1:8080/ in your browser.");
	runApplication();
}
