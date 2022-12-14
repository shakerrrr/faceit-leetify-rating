(async function () {
  "use strict";
  const leetify_access_token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkMjI2ZjA4Ny1mNjZjLTQ4M2MtYTMyMi1lMzE4NjEzMzVlMjMiLCJpYXQiOjE2NjE5OTIyMDZ9.N118a-3ZGb5nkgVo1ibgbbc2Sv1mHlJfc9D70nuX1_I";
  const lvid = "d0b5ac8b05023e0cd278ec0c43a83ef2";

  const leetify_post_options = {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      Authorization: `Bearer ${leetify_access_token}`,
      lvid: lvid,
      "Content-Type": "application/json",
    },
  };
  const leetify_get_options = {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      Authorization: `Bearer ${leetify_access_token}`,
      lvid: lvid,
    },
  };
  const faceit_get_options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: "Bearer 976016be-48fb-443e-a4dc-b032c37dc27d",
    },
  };
  let my_elements = [];
  let old_url;

  const data = {
    leetify_rating: "NOT FOUND",
    hltv_rating: "NOT FOUND",
    adr: "NOT FOUND",
    games: [],
    last_username: undefined,
    match_data: undefined,
    last_match_id: undefined,
    get_leetify_rating: async (username) => {
      if (username == data.last_username) {
        return {
          leetify: data.leetify_rating,
          hltv: data.hltv_rating,
          adr: data.adr,
          games: data.games,
        };
      } else {
        try {
          data.last_username = username;
          data.leetify_rating = "NOT FOUND";
          data.hltv_rating = "NOT FOUND";
          data.adr = "NOT FOUND";
          data.games = [];
          let steam_64_id;
          let leetify_user_id;
          const res_player = await fetch(
            `https://open.faceit.com/data/v4/players?nickname=${username}`,
            faceit_get_options
          );
          if (res_player.ok) {
            const res_player_body = await res_player.json();
            steam_64_id = res_player_body.games.csgo.game_player_id;
          }

          if (steam_64_id) {
            let options = leetify_post_options;
            options.body = `{"searchTerm":"${steam_64_id}"}`;

            const res_search = await fetch(
              "https://api.leetify.com/api/user/search",
              leetify_post_options
            );

            if (res_search.ok) {
              const res_search_body = await res_search.json();
              if (res_search_body.length > 0) {
                leetify_user_id = res_search_body[0].userId;
              }
            }

            if (leetify_user_id) {
              const res_general_data = await fetch(
                `https://api.leetify.com/api/general-data?side=null&roundEconomyType=null&dataSources=faceit&spectatingId=${leetify_user_id}`,
                leetify_get_options
              );

              if (res_general_data.ok) {
                const res_general_data_body = await res_general_data.json();
                data.leetify_rating = (
                  res_general_data_body.generalData.current.gamesTotals.leetifyRating * 100
                ).toFixed(2);
                data.hltv_rating = res_general_data_body.generalData.current.gamesTotals.hltvRating;
                data.games = res_general_data_body.generalData.current.games;
                data.adr = Math.round(res_general_data_body.generalData.current.gamesTotals.adr);
              }

              if (data.leetify_rating == 0 && data.hltv_rating == 0) {
                data.games = [];
                const res_general_data_alt = await fetch(
                  `https://api.leetify.com/api/general-data?side=null&roundEconomyType=null&spectatingId=${leetify_user_id}`,
                  leetify_get_options
                );

                if (res_general_data_alt.ok) {
                  const res_general_data_alt_body = await res_general_data_alt.json();
                  data.leetify_rating = (
                    res_general_data_alt_body.generalData.current.gamesTotals.leetifyRating * 100
                  ).toFixed(2);
                  data.hltv_rating =
                    res_general_data_alt_body.generalData.current.gamesTotals.hltvRating;
                  data.adr = Math.round(
                    res_general_data_alt_body.generalData.current.gamesTotals.adr
                  );
                }
              }
            } else {
              const res_alternative = await fetch(
                `https://api.leetify.com/api/mini-profiles/${steam_64_id}`,
                leetify_get_options
              );

              if (res_alternative.ok) {
                const res_alternative_body = await res_alternative.json();

                data.leetify_rating = (res_alternative_body.ratings.leetify * 100).toFixed(2);
              }
            }
          }
          return {
            leetify: data.leetify_rating,
            hltv: data.hltv_rating,
            adr: data.adr,
            games: data.games,
          };
        } catch (error) {
          console.error(error);
        }
        return undefined;
      }
    },
    get_match_data: async (match_id) => {
      if (match_id == data.last_match_id) {
        return data.match_data;
      } else {
        try {
          data.last_match_id = match_id;
          let steam_64_ids = [];
          const res_match = await fetch(
            `https://open.faceit.com/data/v4/matches/${match_id}`,
            faceit_get_options
          );
          if (res_match.ok) {
            const res_match_body = await res_match.json();

            for (let player of res_match_body.teams.faction1.roster) {
              steam_64_ids.push(player.game_player_id);
            }
            for (let player of res_match_body.teams.faction2.roster) {
              steam_64_ids.push(player.game_player_id);
            }
          }
          if (steam_64_ids) {
            for (let id of steam_64_ids) {
              let leetify_id;

              let options = leetify_post_options;
              options.body = `{"searchTerm":"${id}"}`;

              const res_search = await fetch("https://api.leetify.com/api/user/search", options);

              if (res_search.ok) {
                const res_search_body = await res_search.json();
                if (res_search_body.length > 0) {
                  leetify_id = res_search_body[0].userId;
                  const res_history = await fetch(
                    `https://api.leetify.com/api/games/history?dataSources=faceit&periods=%7B%22currentPeriod%22%3A%7B%22startDate%22%3A%2201.01.2015%22,%22endDate%22%3A%2201.01.3000%22%7D,%22previousPeriod%22%3A%7B%22startDate%22%3A%2201.10.2014%22,%22endDate%22%3A%2224.12.2014%22%7D%7D&spectatingId=${leetify_id}`,
                    leetify_get_options
                  );
                  if (res_history.ok) {
                    const res_history_body = await res_history.json();
                    if (res_history_body.games.length > 0) {
                      for (let game of res_history_body.games) {
                        if (game.faceitMatchId == match_id) {
                          let options = leetify_get_options;

                          const res_leetify_match = await fetch(
                            `https://api.leetify.com/api/games/${game.id}`,
                            options
                          );
                          if (res_leetify_match.ok) {
                            const res_leetify_match_body = await res_leetify_match.json();
                            data.match_data = res_leetify_match_body;
                            return data.match_data;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
        return undefined;
      }
    },
  };

  function add_match_elements(match_data) {
    if (!match_data) {
      return;
    }
    try {
      if (my_elements.length != 0) {
        remove_my_elements();
      }
      // find the shadow root(s) (very cringe)
      const shadows = Array.from(document.querySelectorAll("*"))
        .map((el) => el.shadowRoot)
        .filter(Boolean);
      shadows.forEach((s) => {
        let elements = s.querySelectorAll("span");
        elements.forEach((e) => {
          if (e.lastChild && e.lastChild.data == "Kills") {
            const td = e.parentNode;
            const my_td = td.cloneNode(true);
            my_td.lastChild.lastChild.data = "Leetify";
            td.parentNode.insertBefore(my_td, td);
            my_elements.push(my_td);

            const players = td.parentNode.parentNode.nextSibling;
            for (let player of players.childNodes) {
              const name = player.firstChild.firstChild.firstChild.lastChild.lastChild.data;
              const my_td2 = player.firstChild.nextSibling.cloneNode(true);
              for (let stats of match_data.playerStats) {
                if (stats.name == name) {
                  const leetify_rating = (stats.leetifyRating * 100).toFixed(2);
                  my_td2.lastChild.lastChild.data = leetify_rating;
                  if (leetify_rating > 2) {
                    my_td2.lastChild.style.color = "#32d35a";
                  }
                  if (leetify_rating < -2) {
                    my_td2.lastChild.style.color = "#ff002b";
                  }
                }
              }
              player.insertBefore(my_td2, player.firstChild.nextSibling);
              my_elements.push(my_td2);
            }
          }
        });
      });
    } catch (error) {
      console.error(error);
    }
  }

  function remove_my_elements() {
    my_elements.forEach((element) => {
      let parent = element.parentNode;
      if (parent) {
        parent.removeChild(element);
      }
    });
    my_elements = [];
  }

  function add_match_history_ratings(e, ratings) {
    const table = e.parentNode.nextSibling.firstChild;
    if (table && table.childNodes.length > 0) {
      let games_index = ratings.games.length - 1;

      for (let i = 1; i < table.childNodes.length && games_index >= 0; i++) {
        const map = table.childNodes[i].childNodes[4].firstChild.lastChild.data;
        if (map == ratings.games[games_index].mapName) {
          const rating = (ratings.games[games_index].leetifyRating * 100).toFixed(2);
          const div = document.createElement("div");
          if (rating > 2) {
            div.style.color = "#32d35a";
          } else if (rating < -2) {
            div.style.color = "#ff002b";
          } else {
            div.style.color = "rgb(255, 255, 255)";
          }
          div.style.fontWeight = "normal";
          div.style.textTransform = "none";
          const text = document.createTextNode(`Leetify Rating: ${rating}`);
          div.appendChild(text);

          table.childNodes[i].childNodes[2].lastChild.lastChild.parentNode.insertBefore(
            div,
            table.childNodes[i].childNodes[2].lastChild.lastChild.nextSibling
          );
          if (
            (table.childNodes[i].childNodes[2].firstChild.firstChild.data.length == 29 &&
              rating.length == 4) ||
            (table.childNodes[i].childNodes[2].firstChild.firstChild.data.length == 30 &&
              rating.length == 5)
          ) {
            const str = table.childNodes[i].childNodes[2].firstChild.firstChild.data;
            const new_str = str.substr(0, 3) + str.substr(str.length - 6, 6);
            table.childNodes[i].childNodes[2].firstChild.firstChild.data = new_str;
          }
          if (
            (table.childNodes[i].childNodes[2].firstChild.firstChild.data.length == 30 &&
              rating.length == 4) ||
            (table.childNodes[i].childNodes[2].firstChild.firstChild.data.length == 31 &&
              rating.length == 5)
          ) {
            const str = table.childNodes[i].childNodes[2].firstChild.firstChild.data;
            const new_str = str.substr(0, 4) + str.substr(str.length - 6, 6);
            table.childNodes[i].childNodes[2].firstChild.firstChild.data = new_str;
          }

          games_index--;
          my_elements.push(div);
        }
      }
    }
  }

  function add_profile_ratings(e, ratings) {
    const title = e.parentNode;
    const tiles = title.nextSibling;
    const divider = tiles.nextSibling;

    const my_title = title.cloneNode(true);
    my_title.firstChild.firstChild.data = "RATINGS (LAST 30 MATCHES)";

    const my_tiles = tiles.cloneNode(true);
    while (my_tiles.childElementCount > 3) {
      my_tiles.removeChild(my_tiles.lastChild);
    }
    if (my_tiles.firstChild.firstChild.firstChild) {
      my_tiles.children[0].firstChild.firstChild.firstChild.data = ratings.leetify;
      my_tiles.children[0].lastChild.firstChild.firstChild.data = "LEETIFY RATING";
      my_tiles.children[1].firstChild.firstChild.firstChild.data = ratings.hltv;
      my_tiles.children[1].lastChild.firstChild.firstChild.data = "HLTV RATING";
      my_tiles.children[2].firstChild.firstChild.firstChild.data = ratings.adr;
      my_tiles.children[2].lastChild.firstChild.firstChild.data = "ADR";

      const my_divider = divider.cloneNode(true);

      my_elements.push(my_title);
      my_elements.push(my_tiles);
      my_elements.push(my_divider);

      divider.parentNode.insertBefore(my_title, divider.nextSibling);
      my_title.parentNode.insertBefore(my_tiles, my_title.nextSibling);
      my_tiles.parentNode.insertBefore(my_divider, my_tiles.nextSibling);
    }
  }

  function add_elements(ratings) {
    if (!ratings) {
      return;
    }
    try {
      if (my_elements.length != 0) {
        remove_my_elements();
      }
      // find the shadow root(s) (very cringe)
      const shadows = Array.from(document.querySelectorAll("*"))
        .map((el) => el.shadowRoot)
        .filter(Boolean);
      shadows.forEach((s) => {
        let elements = s.querySelectorAll("span");
        elements.forEach((e) => {
          if (e.lastChild && e.lastChild.data == "Main Statistics") {
            add_profile_ratings(e, ratings);
          }

          if (e.lastChild && e.lastChild.data == "Match History" && ratings.games.length == 30) {
            add_match_history_ratings(e, ratings);
          }
        });
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function update(url) {
    const url_segments = url.split("/");
    let index;

    for (let e of url_segments) {
      const is_csgo_stats_page =
        ["players", "players-modal"].includes(e) &&
        url_segments.includes("stats") &&
        url_segments.includes("csgo");
      const is_match_scoreboard_page =
        url_segments.includes("csgo") &&
        url_segments.includes("room") &&
        url_segments.includes("scoreboard");
      if (is_csgo_stats_page) {
        index = url_segments.indexOf(e) + 1;
        let username = url_segments[index];
        const ratings = await data.get_leetify_rating(username);
        add_elements(ratings);
      }
      if (is_match_scoreboard_page) {
        const match_id = url_segments[url_segments.length - 2];
        const match_data = await data.get_match_data(match_id);
        add_match_elements(match_data);
      }
    }
  }

  // Select the node that will be observed for mutations
  const targetNode = document.body;

  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Callback function to execute when mutations are observed
  const callback = async (mutationList, observer) => {
    let current_url = window.location.href;

    if (current_url != old_url) {
      old_url = current_url;
      remove_my_elements();
    }
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  window.onload = () => {
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

    let update_interval = setInterval(async () => {
      let current_url = window.location.href;
      await update(current_url);
    }, 1000);

    // setTimeout(() => {
    //   clearInterval(update_interval);
    // }, 30000);
  };
})();
