using { GalacticService } from './galactic-service';

extend service GalacticService with {

  @description: 'Sent to a spacefarer after they have been enlisted'
  @notification: {
    title        : 'Welcome aboard, {{firstName}}!',
    publicTitle  : 'Welcome aboard',
    subtitle     : 'Your adventurous journey among the stars begins now',
    groupedTitle : 'Galactic Spacefarer Adventure',
    email        : {
      subject : 'Welcome aboard, {{firstName}}!',
      html    : './welcome-email.html'
    },
    channels     : ['email']
  }
  event SpacefarerWelcomed {
    firstName : String;
    lastName  : String;
  }

}
