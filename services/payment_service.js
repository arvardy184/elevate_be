const midtransClient = require('midtrans-client');

const prisma = require('../prisma/client');

//instance snap API
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

//buat instance core API untuk S2S
const core = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

//generate order ID
const generateOrderId = () => {
    return `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

//create transaction
const createTransaction = async (paymentData) => {
    try{
        const {userId, amount, itemDetails, customerDetails} = paymentData;

        const orderId = generateOrderId();

        const transactionDetails = {
            order_id: orderId,
            amount: amount,
            currency: 'IDR',
        };

        const transactionData = {
            transaction_details: transactionDetails,
            item_details: itemDetails,
            customer_details: customerDetails,
            credit_card: {
                secure: true,
            },
        };

        //create transaction via snap
    

        const transaction = await snap.createTransaction(transactionData);
        
        
        return {
            orderId,
            token: transaction.token,
            redirectUrl: transaction.redirect_url,
        };


        
        
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw new Error('Failed to create transaction');
    }
};

//handle payment notification
const handlePaymentNotification = async (notification) => {
    try{
        const statusResponse = await core.transaction.notification(notification);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        //get payment record
        const payment = await prisma.payment.findUnique({
            where: {
                orderId,
            },
        });
        

        if(!payment){
            throw new Error('Payment not found')
            
            ;
        }
        
        let paymentStatus = 'pending';

     
    if (transactionStatus == 'capture') {
        if (fraudStatus == 'challenge') {
          paymentStatus = 'CHALLENGE';
        } else if (fraudStatus == 'accept') {
          paymentStatus = 'SUCCESS';
        }
      } else if (transactionStatus == 'settlement') {
        paymentStatus = 'SUCCESS';
      } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
        paymentStatus = 'FAILED';
      } else if (transactionStatus == 'pending') {
        paymentStatus = 'PENDING';
      }

      await prisma.payment.update({
        where: {
            id: payment.id,
        },
        data: {
            status: paymentStatus,
            paymentStatus:transactionStatus,
            paidAt: paymentStatus === 'SUCCESS' ? new Date() : null,
        }
      });

    // If payment success, update related records
    if (paymentStatus === 'SUCCESS') {
        if (payment.courseId) {
          // Create enrollment
          await prisma.enrollment.create({
            data: {
              userId: payment.userId,
              courseId: payment.courseId,
              isPaid: true,
              paymentId: payment.id
            }
          });
        }
        if (payment.roadmapId) {
            // Unlock roadmap
            await prisma.userRoadmap.create({
              data: {
                userId: payment.userId,
                roadmapId: payment.roadmapId,
                isUnlocked: true,
                unlockedAt: new Date(),
                paymentId: payment.id
              }
            });
          }
        }
        return { status: paymentStatus };
    } catch (error) {
        console.error('Error handling payment notification:', error);
        throw new Error('Failed to handle payment notification');
    }
};

module.exports = {
    createTransaction,
    handlePaymentNotification,
}