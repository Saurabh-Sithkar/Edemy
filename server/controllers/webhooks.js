import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";


// API Controller Function to Manage Clerk User with database

export const clerkWebhooks = async (req, res)=>{
    try{
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        await whook.verify(JSON.stringify(req.body),{
            "svix-id": req.headers["svix-id"],
            "svix-timestamp" : req.headers["svix-timestamp"],
            "svix-signature" : req.headers["svix-signature"]
        })

        const {data, type} = req.body

        switch (type) {
            case 'user.created':{
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.create(userData)
                res.json({})
                break;
            }
                
            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData)
                res.json({})
                break;
            }

            case 'user.deleted' : {
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }
                
            default:
                break;
        }


    } catch(error){
        res.json({success: false, message: error.message})
    }
} 


const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async(request, response)=>{
     const sig = request.headers['stripe-signature'];
     //added
     const payload = request.body;

  let event;

  try {
    // event = Stripe.webhooks.constructEvent(request.body, sig, process.env.
    //     STRIPE_WEBHOOK_SECRET);

    //Added
    event = stripeInstance.webhooks.constructEvent(
            payload, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
  }
  catch (err) {
    //added
    console.error(`Webhook Error: ${err.message}`);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  //added
  console.log(`Received stripe event: ${event.type}`);


  //old code
    // Handle the event
//   switch (event.type) {
//     case 'payment_intent.succeeded':{
//       const paymentIntent = event.data.object;
//       const paymentIntentId = paymentIntent.id;

//         const session = await stripeInstance.checkout.sessions.list({
//             payment_intent: paymentIntentId
//         })

//         const { purchaseId } = session.data[0].metadata;

//         // niche wala line add kiya upper k lines ko commment kr k
//         // const purchaseId = paymentIntent.metadata.purchaseId;


//         const purchaseData = await Purchase.findById(purchaseId)
//         const userData = await User.findById(purchaseData.userId)
//         const courseData = await Course.findById(purchaseData.courseId.toString())

//         // checks
//         if (!purchaseData || !userData || !courseData) {
//   console.error("Missing data:", { purchaseData, userData, courseData });
//   return response.status(400).json({ success: false, message: "Invalid data while handling Stripe webhook." });
// }


//        courseData.enrolledStudents.push(userData)
//       // niche wala line add kiya hu 
//       //courseData.enrolledStudents.push(userData._id);
//         await courseData.save()

//         userData.enrolledCourses.push(courseData._id)
//         await userData.save()

//         purchaseData.status = 'completed'
//         await purchaseData.save()

//       break;
//     }

//     case 'payment_intent.payment_failed':{
//             const paymentIntent = event.data.object;
//       const paymentIntentId = paymentIntent.id;

//         const session = await stripeInstance.checkout.sessions.list({
//             payment_intent: paymentIntentId
//         })

//         const { purchaseId } = session.data[0].metadata;
//         const purchaseData = await Purchase.findById(purchaseId)
//         purchaseData.status = 'failed'
//         await purchaseData.save()


//       break;}
//     // ... handle other event types
//     default:
//       console.log(`Unhandled event type ${event.type}`);
//   }

//   // Return a response to acknowledge receipt of the event
//   response.json({received: true});

// }


//new code

// Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;
                
                console.log(`Processing payment_intent.succeeded for ID: ${paymentIntentId}`);
                
                // Get session data to retrieve metadata
                const sessions = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId,
                    expand: ['data.metadata']
                });
                
                if (!sessions.data || sessions.data.length === 0) {
                    console.error('No session found for payment intent:', paymentIntentId);
                    return response.status(400).json({
                        success: false, 
                        message: "No session found for payment intent"
                    });
                }
                
                const { purchaseId } = sessions.data[0].metadata;
                
                if (!purchaseId) {
                    console.error('No purchaseId found in metadata');
                    return response.status(400).json({
                        success: false, 
                        message: "No purchaseId found in metadata"
                    });
                }
                
                console.log(`Found purchaseId: ${purchaseId} in session metadata`);
                
                // Fetch related data
                const purchaseData = await Purchase.findById(purchaseId);
                if (!purchaseData) {
                    console.error(`Purchase not found with ID: ${purchaseId}`);
                    return response.status(404).json({
                        success: false, 
                        message: `Purchase not found with ID: ${purchaseId}`
                    });
                }
                
                const userData = await User.findById(purchaseData.userId);
                if (!userData) {
                    console.error(`User not found with ID: ${purchaseData.userId}`);
                    return response.status(404).json({
                        success: false, 
                        message: `User not found with ID: ${purchaseData.userId}`
                    });
                }
                
                const courseData = await Course.findById(purchaseData.courseId.toString());
                if (!courseData) {
                    console.error(`Course not found with ID: ${purchaseData.courseId}`);
                    return response.status(404).json({
                        success: false, 
                        message: `Course not found with ID: ${purchaseData.courseId}`
                    });
                }
                
                // Update data - ensure we're using the proper ID format
                // Add user to course's enrolled students
                if (!courseData.enrolledStudents.includes(userData._id)) {
                    courseData.enrolledStudents.push(userData._id);
                    await courseData.save();
                    console.log(`Added user ${userData._id} to course's enrolled students`);
                }
                
                // Add course to user's enrolled courses
                if (!userData.enrolledCourses.includes(courseData._id)) {
                    userData.enrolledCourses.push(courseData._id);
                    await userData.save();
                    console.log(`Added course ${courseData._id} to user's enrolled courses`);
                }
                
                // Update purchase status to completed
                purchaseData.status = 'completed';
                await purchaseData.save();
                console.log(`Updated purchase status to completed for ID: ${purchaseId}`);
                
                break;
            }
            
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;
                
                console.log(`Processing payment_intent.payment_failed for ID: ${paymentIntentId}`);
                
                const sessions = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId
                });
                
                if (!sessions.data || sessions.data.length === 0) {
                    console.error('No session found for failed payment intent:', paymentIntentId);
                    return response.status(400).json({
                        success: false, 
                        message: "No session found for failed payment intent"
                    });
                }
                
                const { purchaseId } = sessions.data[0].metadata;
                
                if (!purchaseId) {
                    console.error('No purchaseId found in metadata for failed payment');
                    return response.status(400).json({
                        success: false, 
                        message: "No purchaseId found in metadata for failed payment"
                    });
                }
                
                const purchaseData = await Purchase.findById(purchaseId);
                if (!purchaseData) {
                    console.error(`Purchase not found with ID: ${purchaseId} for failed payment`);
                    return response.status(404).json({
                        success: false, 
                        message: `Purchase not found with ID: ${purchaseId} for failed payment`
                    });
                }
                
                purchaseData.status = 'failed';
                await purchaseData.save();
                console.log(`Updated purchase status to failed for ID: ${purchaseId}`);
                
                break;
            }
            
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error processing Stripe webhook:', error);
        return response.status(500).json({
            success: false,
            message: `Error processing webhook: ${error.message}`
        });
    }
    
    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
}

