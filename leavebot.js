
// ==UserScript==
// @name         leavebot for robbin
// @namespaaace    http://tampermonkey.net/
// @version      0.1
// @description  Seed and leave smaller tiers
// @author       u/jfb1337
// @include      https://www.reddit.com/robin*
// @require       http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant   GM_getValue
// @grant   GM_setValue
// @grant   GM_xmlhttpRequest
// ==/UserScript==

(function (){
	
	var botList = JSON.parse(localStorage.getItem("leavebot-botlist")) || {};

	function saveBotlist () {
		localStorage.setItem("leavebot-botlist", JSON.stringify(botList));
	}
	function clearBotlist () {
		localStorage.setItem("leavebot-botlist", "{}")
		botList = {};
	}

	function sendMessage (msg, overridePrefix) {
		var prefix = overridePrefix ? "" : "%leavebot ";
		$(".robinMessageTextAlt").val(msg);
		$(".sendBtn").click();
	}

	function leave () {
		sendMessage("Bye, leaving to seed smaller tiers!");
		sendMessage("/leave_room", true);
	}

	var sizeThreshold = 32, lastStatisticsUpdate = Math.floor(Date.now()/1000);
	function update () {
		//Code largely stolen from Parrot

		var users = 0;
        $.get("/robin/", function(a) {
            var START_TOKEN = "<script type=\"text/javascript\" id=\"config\">r.setup(";
            var END_TOKEN = ")</script>";
            var start = a.substring(a.indexOf(START_TOKEN)+START_TOKEN.length);
            var end = start.substring(0,start.indexOf(END_TOKEN));
            var config = JSON.parse(end);
            var list = config.robin_user_list;


            var counts = list.reduce(function(counts, voter) {
                counts[voter.vote] += 1;
                if(voter.vote !== "INCREASE"){ //Can't be a leavebot if it's not autogrowing
                	botlist[voter.name] = "no";
                }
                return counts;
            }, {
                INCREASE: 0,
                ABANDON: 0,
                NOVOTE: 0,
                CONTINUE: 0
            });

            users = list.length;
            var currentTime = Math.floor(Date.now()/1000);

            if(counts.INCREASE * 2 < users){
            	leave();
            }

            if((currentTime-lastStatisticsUpdate)>=60)
            {
                lastStatisticsUpdate = currentTime;

                // Report statistics to the automated leaderboard
                trackers = [
                    "https://monstrouspeace.com/robintracker/track.php"
                ];

                queryString = "?id=" + config.robin_room_name.substr(0,10) +
                    "&guid=" + config.robin_room_id +
                    "&ab=" + counts.ABANDON +
                    "&st=" + counts.CONTINUE +
                    "&gr=" + counts.INCREASE +
                    "&nv=" + counts.NOVOTE +
                    "&count=" + users +
                    "&ft=" + Math.floor(config.robin_room_date / 1000) +
                    "&rt=" + Math.floor(config.robin_room_reap_time / 1000);

                trackers.forEach(function(tracker){
                    $.get(tracker + queryString);
                });
            }
        }
        var lastChatString = $(".robin-message--timestamp").last().attr("datetime");
        var timeSinceLastChat = new Date() - (new Date(lastChatString));
        var now = new Date();
        if (timeSinceLastChat !== undefined && (timeSinceLastChat > 600000 && now - timeStarted > 600000)) {
            if (settings.timeoutEnabled)
                window.location.reload(); // reload if we haven't seen any activity in a minute.
        }

        // Try to join if not currently in a chat
        if ($("#joinRobinContainer").length) {
            $("#joinRobinContainer").click();
            setTimeout(function() {
                $("#joinRobin").click();
            }, 1000);
        }

        $(".robin-message").forEach(function($message) {
			var name = $message.find(".robin-message--from robin--username").text().trim();
			var text = $message.find(".robin-message--message").text.trim();

			if(text.startsWith("%leavebot") && !botlist[name]){
				botlist[name] = "probably";
			}
			else{
				botlist[name] = "no";
			}
			$message.removeClass(".robin-message"); //So it's not selected in future
		});

        var botcount = 0;
	}

	//todo: "spam" chat to convince users to install

})()