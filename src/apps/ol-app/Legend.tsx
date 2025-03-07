import React from "react";
import { Box, Flex, Text, Circle } from "@open-pioneer/chakra-integration";

const Legend = () => {
  return (
    <Box
      position="absolute"
      bottom="10px"
      left="10px"
      backgroundColor="white"
      padding={3}
      borderRadius="md"
      boxShadow="md"
      borderWidth="1px"
      borderColor="gray.300"
      zIndex="1000"
    >
      <Text fontSize="md" fontWeight="bold" mb={2}>
        Legend
      </Text>
      <Flex alignItems="center" mb={2}>
        <Circle size="10px" bg="red" mr={2} />
        <Text fontSize="sm">Accidents</Text>
      </Flex>
      <Flex alignItems="center">
        <Circle size="10px" bg="blue" mr={2} />
        <Text fontSize="sm">Bicycle Counting Stations</Text>
      </Flex>
    </Box>
  );
};

export default Legend;
