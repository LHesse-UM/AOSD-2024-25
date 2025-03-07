import { Box, Text, Button } from "@open-pioneer/chakra-integration";

const WelcomeModal = ({ onClose }) => {
    return (
        <Box
        position="fixed"
        top="0"
        left="0"
        width="100vw"
        height="100vh"
        backgroundColor="rgba(0, 0, 0, 0.5)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        zIndex="1100"
      >
        <Box
          backgroundColor="white"
          padding={5}
          borderRadius="md"
          boxShadow="lg"
          textAlign="center"
          maxWidth="800px"
        >
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            Welcome to the Münster Bicycle Safety Analysis Application
          </Text>
        
          <Text fontSize="sm" mb={4}>
            This application allows you to access information about bicycle accidents in Münster as well as the bicycle counting stations throughout the city. The interface is divided into two main sections.
          </Text>
          <Text fontSize="md" fontWeight="bold" mb={2}>Map Page</Text>
          <Text fontSize="sm" mb={4}>
            On the Map Page you can explore the locations of bicycle accidents that occurred between 2019 and 2023. Additionally, all currently available bicycle counting stations in Münster are displayed. The size of the bicycle counting stations adapts based on their relative usage. Higher traffic results in a larger display size. You can adjust a date and time range, which updates the map to match your input. However, note that accident data is only filtered by days and months, not by specific hours.
          </Text>
          
          <Text fontSize="md" fontWeight="bold" mb={2}>Plot Page</Text>
          <Text fontSize="sm" mb={4}>
          On the Plot Page, you can again define a temporal frame to explore additional insights through charts and tables that enhance your understanding of bicycle usage and accidents.
          </Text>
          <Text fontSize="md" fontWeight="bold" mb={2}>Important Information!</Text>
          <Text fontSize="sm" mb={4}>
          This application may take some time to process your input. Please be patient, especially during startup or after adjusting the time settings.          </Text>
          
          <Button colorScheme="blue" onClick={onClose}>Got it</Button>
        </Box>
      </Box>
    );
  };

  export { WelcomeModal };