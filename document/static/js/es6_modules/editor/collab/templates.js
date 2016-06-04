export let messageTemplate = _.template(
    `<div class="message" id="m<%= message.id %>">
        <div class="comment-user">
            <img class="comment-user-avatar" src="<%= theChatter.avatar %>">
            <h5 class="comment-user-name"><%= theChatter.name %></h5>
            <p class="comment-date"><%= localizeDate(new Date()) %></p>
        </div>
        <%- message.body %>
    </div>
`)

export let participantListTemplate = _.template(
    '<% _.each(participants, function(participant) { %><img src="<%= participant.avatar %>" alt="<%- participant.name %>" title="<%- participant.name %>" class="avatar user-<%- participant.colorId %>"><% }); %>'
)
