<template>
  Welcome to the adventure page
  <pre>{{ question }}</pre>
</template>
<script setup>
const { data: question } = await useFetch("/api/question/question");
</script>
