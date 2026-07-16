##  User profile
- User should be able to upload their profile picture to the application and it will show whereevr a user list is shown , with standard on click zoom functionality . Upload picture should have functionality of pic area selection like we have for whatsapp profile picture selection.
- Whena SUUser adds another user to their apartmnet then it does not need to be approved by Admin .It will just associate the user to this apartment directly 
- If a user associated with multiple apartment then in left hand top side it will show a dropdown to select the apartment , all menu and functionality available to user should be based on that selected apartment and the roles of that user to that apartment , like if the user is a tenent then they will not see the finacial option 
- If a SUUser shares a apartment joining link to a user who already have a account in the system then on dashboard of the users with which its been shared will have a accept and deny option to accept the invitation for apartment joining . they can accept or deny . In case they come from the link shared in their email then application will directly take them to login page with emailid prepopulated ..
- Raw userid will not been shown anywhare , instead it will always be USer full name , like in notice detail screen Posted by  is showing raw user id instead of Full Name.

## Visitors
- ONce visitor is checked in a checkin time will be logged and once they are exiting security user will check them out , SuSecurity and SUAdmin should be able to see the checkin and checkout time in the reports .
- When the visitor request is approved then they should be auto checked in , Security or admin user does not have to checkin them separately . Same for the PASS verification , when the pass is verified the visitor will be checked in . 
- In case of pre approved visitor pass valid duration will override the default checkout value , so even if they crossed the thresold they will still not be flagged as long as their pass is valid .
- In case the visitor does not check out system will check them out automatically after 24 hrs . in case its been more than 5 hours ( needs to be configured a socity level ) it will show in RED in the visitor list .

## Socity 
- SUAdmin should not be able to modify the no of Apartment , it can only be modified by HQAdmin .
- Socity should have a cap of no user it can assocaite to its apartment , which will be shown in socity page but SUAdmin should not be able to modify that only HQAdmin shouuld be to modify 