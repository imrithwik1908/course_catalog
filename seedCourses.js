// seedCourses.js 

const mongoose = require('mongoose');
const Course = require('./models/Course'); // Import your Course model

// Function to seed courses
async function seedCourses() { 
    const courses = [
        { name: "Introduction to Programming", courseCode: "CS101", credits: 3, professor: "60d5f9f1f0c1a855c488c150" },
        { name: "Data Structures", courseCode: "CS102", credits: 4, professor: "60d5f9f1f0c1a855c488c150" },
        { name: "Database Management Systems", courseCode: "CS103", credits: 3, professor: "60d5f9f1f0c1a855c488c150" },
        { name: "Web Development", courseCode: "CS104", credits: 5, professor: "60d5f9f1f0c1a855c488c150" },
        { name: "Machine Learning", courseCode: "CS105", credits: 4, professor: "60d5f9f1f0c1a855c488c150" },
    ];

    try {
        await Course.deleteMany({}); // Clear existing courses
        await Course.insertMany(courses); // Add fake courses
        console.log("Fake courses added successfully!");
    } catch (err) {
        console.error("Error adding courses:", err);
    }
}

// Export the function
module.exports = seedCourses;
