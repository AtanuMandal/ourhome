# Visitor Log

## Overview
The visitor log module will maintain a record of all visitors entering and exiting the society premises. This will enhance security and provide a way to track visitor activity.

## Features

1. **Visitor Registration**
   - Security user can register visitors at the gate.
   - Security user Record visitor details (e.g., name, contact, purpose of visit,company(amazon, swiggy,zomato,personal),car/bike no,block , floor and flat no, Image which can be directly added from the field by using device camera  ).
   - SUSecurity should be able to add visitor like SUAdmin does , currently it has option just to pre approve visitor .
  Pre approve option only be availble for SUUser

2. **Visitor Pass**
   - Generate a digital or physical visitor pass when resident pre enters the data for the visitor .
   - QR code-based entry for quick verification.Security personal can scan and verify the QR code.
   - Visitor Pass should be sharable via unique link to any email address or ph no , this link will be showing the approval page and the QR code . This link only be valid for the duration of the Pass validity 
   - SUSecurity should be able to scan the QR code via device camera and find if that Pass belongs to which apartment .

3. **Resident Notifications**
   - Notify residents  when a visitor arrives for them, in case its pre aapproves residents dont have to approve the request .
   - Option for residents to approve or deny visitor entry.
   - Once a visitor request has been initiated apartment owner would get push( in case web brwser notification) notification with approve and deny option , this will have visitor name , ph no and image displayed.
   - Once approved/Denied  visot list would display current status almost realtime . So auto refresh the status is required.
   - When apartmnet owner requesting for visitor they should only be add visitor for their apartment, which would be a pre approved request .
   - Apartment owners can request for visitor for certain deruation of time . during this that visitor passcode will be valid . 

4. **Visitor History**
   - Maintain a log of all visitors.
   - Search and filter visitor records by date, name, or resident.

5. **Reports**
   - Generate visitor reports for a specific period.
   - Export visitor logs for record-keeping.