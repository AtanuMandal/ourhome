# Add Vendor management and the cost management
## Overview
For and apartment SUAdmin should be able  manage any vendor by ading them and setting up reoccuring payment . Admin can also add any adhoc cost . Admin should be able to mark the payment done .
## Requiremnts

### Vendor setup 
- Apartment admin should be able to add reoccuring Vendor by
    - Name
    - Address
    - Picture 
    - Point of Contact
        - First Name
        - Last Name
        - Phone number 
        - Email 
    - Overview
    - Valid upto Date
    - Payment Due date(number of Days)
    - Geographic Service Area (optional)
    - Business Area/Type(optional)    - 
    - Contract file upload , should be optional.
- Apartment Admin shoul be able to setup reoccuring cost schedule for added vendor (shoule be seletcable and searchable with autopopulate ) for reoccuring cost.
    - Cost schedule supports below frequency .
        - Weekly
        - By Weekly 
        - Monthly
        - Quarterly
        - Yearly
    - Cost should be fixed amount( once entered it will shown monthly and yearly cost calculated from the frequency)
    - Cost should have 
        - Start date(only Month and year)
        - End Date(only Month and year)
- Apartment Admin should be able to add one time cost for vendor (shoule be seletcable and searchable with autopopulate ) 
    - Effective date (only Month and year)
    - Cost
- Apartment admin should be able to add multiple schedule as well as multiple one time cost for a vendor
- In case a schedule is made inactive from a certain date from schedule update section , all future charges for that     schedule will be inactive
- Schedule end date can also be updated . Charges will be valid only till effective date , in case effective date is modified all future date charge will be inactive. if the end date is extended then only the difference charges will be added .
- Schedule end date can not be more than vendor Valid upto date.

### Vendor Cost view 
- Apartment admin should be able to view all cost for all vendor for their socity in a Grid view only , where x axis will be month and Y axis will be Vendor .
- Totsl cost for a vendor for a month needs to be shown in the grid . 
- Each cost will have a pay option , once clicked will ask for payment recipt and date in a popup.
- Each cost will have inactive option and with delete option and active option after inactivation.
- Inactive cost should not be included in total cost .
- in case a cost is not paid till Payment due date it will mark in Red and send Notification to admin.
- at grid bottom total cost for a month will be shown, with paid and due amount.