var socket = io();

function scrollToBottom() {
    var message =jQuery('#messageList');
    var newMessage = message.children('li');

    var clientHeight =message.prop('clientHeight');
    var scrollTop = message.prop('scrollTop');
    var scrollHeight = message.prop('scrollHeight');

    var newMessageHeight = newMessage.innerHeight();
    var lastMessageHeight = newMessage.prev().innerHeight();

    if(clientHeight+ scrollTop+ newMessageHeight+ lastMessageHeight>= scrollHeight){
        message.scrollTop(scrollHeight);
    }
}


socket.on('connect', function () {
    console.log("Connect to Network");

});

socket.on('disconnect', function () {
    console.log("Disconnected");
});

socket.on('newMessage', function (message) {
    var template = jQuery('#messageTemplate').html();
    var currentTime = moment(message.createdAt).format('h:mm a');
    var html = Mustache.render(template, {
        text: message.text,
        from: message.from,
        createdAt: currentTime
    });

    jQuery('#messageList').append(html);
    scrollToBottom();
});

socket.on('newLocationMessage', function (message) {
    var template = jQuery('#locationTemplate').html();
    var currentTime = moment(message.createdAt).format('h:mm a');
    var html = Mustache.render(template, {
        url: message.url,
        from: message.from,
        createdAt: currentTime
    });
    jQuery('#messageList').append(html);
    scrollToBottom();
})

var messageBox = jQuery('[name=message]');


jQuery('#messageForm').on('submit', function (e) {
    e.preventDefault();

    socket.emit('createMessage', {
        from: 'User', text: messageBox.val()
    }, function (e) {
        messageBox.val('');
    })
});

var locationButton = jQuery('#sendLocation');
locationButton.on('click', function () {

    if (!navigator.geolocation) {
        return alert('Your Browser does not support geolocatoion');
    }
    locationButton.attr('disabled', 'disabled').text('Sending Location');
    navigator.geolocation.getCurrentPosition(function (position) {
        socket.emit('createLocationMessage', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        });
        locationButton.removeAttr('disabled').text('Send Location');
    }, function () {
        locationButton.removeAttr('disabled').text('Send Location');
        alert('Unable to fetch the location');
    })
});
